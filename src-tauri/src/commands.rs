use std::path::Path;

use parking_lot::RwLock;
use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::error::AppError;
use crate::index::{Index, Node, NodeKey, NodeKind};
use crate::parser;
use crate::search;

/// Holds the parsed JSON and its index. `value` is kept around for JSONPath
/// queries (serde_json_path walks the live Value).
pub struct Loaded {
    pub value: Value,
    pub index: Index,
}

#[derive(Default)]
pub struct AppState {
    pub current: RwLock<Option<Loaded>>,
}

#[derive(Serialize)]
pub struct FileMeta {
    pub path: String,
    pub size: u64,
    pub node_count: u32,
    pub parse_ms: u64,
    pub index_ms: u64,
    pub root_id: u32,
}

#[derive(Serialize)]
pub struct NodeView {
    pub id: u32,
    pub parent: Option<u32>,
    pub key: NodeKey,
    pub kind: NodeKind,
    pub child_count: u32,
    pub preview: Option<String>,
}

impl NodeView {
    fn from(n: &Node) -> Self {
        Self {
            id: n.id,
            parent: n.parent,
            key: n.key.clone(),
            kind: n.kind,
            child_count: n.child_count,
            preview: n.preview.clone(),
        }
    }
}

#[tauri::command]
pub fn open_file(path: String, state: State<'_, AppState>) -> Result<FileMeta, AppError> {
    let outcome = parser::load_file(Path::new(&path))?;
    let index = Index::build(&outcome.value);
    let meta = FileMeta {
        path,
        size: outcome.size_bytes,
        node_count: index.nodes.len() as u32,
        parse_ms: outcome.parse_ms,
        index_ms: index.build_ms,
        root_id: index.root,
    };
    *state.current.write() = Some(Loaded {
        value: outcome.value,
        index,
    });
    Ok(meta)
}

#[tauri::command]
pub fn close_file(state: State<'_, AppState>) {
    *state.current.write() = None;
}

#[tauri::command]
pub fn get_node(id: u32, state: State<'_, AppState>) -> Result<NodeView, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    let n = loaded.index.get(id).ok_or(AppError::InvalidNode(id))?;
    Ok(NodeView::from(n))
}

#[tauri::command]
pub fn get_children(
    id: u32,
    offset: u32,
    limit: u32,
    state: State<'_, AppState>,
) -> Result<Vec<NodeView>, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    let kids = loaded.index.children(id);
    let start = (offset as usize).min(kids.len());
    let end = (start + limit as usize).min(kids.len());
    let slice = &kids[start..end];
    let mut out = Vec::with_capacity(slice.len());
    for cid in slice {
        if let Some(n) = loaded.index.get(*cid) {
            out.push(NodeView::from(n));
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn get_ancestors(id: u32, state: State<'_, AppState>) -> Result<Vec<u32>, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    Ok(loaded.index.ancestors(id))
}

#[tauri::command]
pub fn get_value(id: u32, state: State<'_, AppState>) -> Result<String, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    // Re-walk the original Value down to the requested node so we can serialize
    // the subtree. Pointer-based lookup would be O(depth) but we already have
    // the path via ancestors.
    let v = resolve_value(&loaded.value, &loaded.index, id)?;
    serde_json::to_string_pretty(v)
        .map_err(|e| AppError::Parse(format!("serialize: {e}")))
}

#[tauri::command]
pub fn get_path(id: u32, state: State<'_, AppState>) -> Result<String, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    Ok(loaded.index.path_of(id))
}

#[tauri::command]
pub fn search(
    query: String,
    mode: String,
    state: State<'_, AppState>,
) -> Result<Vec<u32>, AppError> {
    let guard = state.current.read();
    let loaded = guard.as_ref().ok_or(AppError::NoFile)?;
    match mode.as_str() {
        "text" => Ok(search::search_text(&loaded.index, &query)),
        "jsonpath" => search::search_jsonpath(&loaded.index, &loaded.value, &query),
        _ => Err(AppError::Parse(format!("unknown search mode: {mode}"))),
    }
}

fn resolve_value<'a>(root: &'a Value, index: &Index, id: u32) -> Result<&'a Value, AppError> {
    let mut chain = index.ancestors(id);
    chain.push(id);
    let mut current = root;
    for step_id in chain {
        let node = index.get(step_id).ok_or(AppError::InvalidNode(step_id))?;
        match &node.key {
            NodeKey::Root => {}
            NodeKey::ObjectKey { key } => {
                current = current
                    .as_object()
                    .and_then(|m| m.get(key))
                    .ok_or(AppError::InvalidNode(step_id))?;
            }
            NodeKey::ArrayIndex { index: i } => {
                current = current
                    .as_array()
                    .and_then(|a| a.get(*i as usize))
                    .ok_or(AppError::InvalidNode(step_id))?;
            }
        }
    }
    Ok(current)
}
