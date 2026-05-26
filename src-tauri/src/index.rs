use std::ops::Range;
use std::time::Instant;

use serde::Serialize;
use serde_json::Value;

const PREVIEW_MAX: usize = 80;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    Object,
    Array,
    String,
    Number,
    Bool,
    Null,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum NodeKey {
    Root,
    ObjectKey { key: String },
    ArrayIndex { index: u32 },
}

#[derive(Debug, Clone, Serialize)]
pub struct Node {
    pub id: u32,
    pub parent: Option<u32>,
    pub key: NodeKey,
    pub kind: NodeKind,
    pub child_count: u32,
    pub preview: Option<String>,
    // children are stored as a slice into the shared `child_ids` arena.
    #[serde(skip)]
    pub children: Range<u32>,
}

pub struct Index {
    pub nodes: Vec<Node>,
    pub child_ids: Vec<u32>,
    pub root: u32,
    pub build_ms: u64,
}

impl Index {
    pub fn build(value: &Value) -> Self {
        let started = Instant::now();
        // Pre-allocate generously — most JSONs end up with one node per scalar/container.
        let mut nodes: Vec<Node> = Vec::with_capacity(estimate_node_count(value));
        let mut child_ids: Vec<u32> = Vec::new();

        let root_id = walk(value, None, NodeKey::Root, &mut nodes, &mut child_ids);

        Self {
            nodes,
            child_ids,
            root: root_id,
            build_ms: started.elapsed().as_millis() as u64,
        }
    }

    pub fn get(&self, id: u32) -> Option<&Node> {
        self.nodes.get(id as usize)
    }

    pub fn children(&self, id: u32) -> &[u32] {
        match self.get(id) {
            Some(n) => &self.child_ids[n.children.start as usize..n.children.end as usize],
            None => &[],
        }
    }

    pub fn ancestors(&self, id: u32) -> Vec<u32> {
        let mut out = Vec::new();
        let mut cur = self.get(id).and_then(|n| n.parent);
        while let Some(p) = cur {
            out.push(p);
            cur = self.get(p).and_then(|n| n.parent);
        }
        out.reverse();
        out
    }

    /// Build a JSONPath-style string for a node, e.g. `$.users[0].email`.
    pub fn path_of(&self, id: u32) -> String {
        let mut chain: Vec<&Node> = Vec::new();
        let mut cur = self.get(id);
        while let Some(n) = cur {
            chain.push(n);
            cur = n.parent.and_then(|p| self.get(p));
        }
        chain.reverse();
        let mut s = String::from("$");
        for n in chain {
            match &n.key {
                NodeKey::Root => {}
                NodeKey::ObjectKey { key } => {
                    if is_simple_ident(key) {
                        s.push('.');
                        s.push_str(key);
                    } else {
                        s.push_str("['");
                        s.push_str(&key.replace('\'', "\\'"));
                        s.push_str("']");
                    }
                }
                NodeKey::ArrayIndex { index } => {
                    s.push('[');
                    s.push_str(&index.to_string());
                    s.push(']');
                }
            }
        }
        s
    }
}

fn is_simple_ident(s: &str) -> bool {
    !s.is_empty()
        && s.chars().next().map_or(false, |c| c.is_ascii_alphabetic() || c == '_')
        && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn estimate_node_count(v: &Value) -> usize {
    // Cheap upper-bound estimate: count containers + scalars at top level, then guess.
    // Avoids a full walk; final Vec will grow if we underestimate, which is fine.
    match v {
        Value::Object(m) => m.len() * 4 + 16,
        Value::Array(a) => a.len() * 4 + 16,
        _ => 1,
    }
}

/// Recursive walk that fills `nodes` and `child_ids`. Returns the id of the node
/// inserted for `value`. We push the parent node first (with an empty children
/// range), recurse for its children, then patch the children range — this gives
/// children contiguous ids in `child_ids`.
fn walk(
    value: &Value,
    parent: Option<u32>,
    key: NodeKey,
    nodes: &mut Vec<Node>,
    child_ids: &mut Vec<u32>,
) -> u32 {
    let id = nodes.len() as u32;
    let (kind, child_count, preview) = match value {
        Value::Object(m) => (NodeKind::Object, m.len() as u32, None),
        Value::Array(a) => (NodeKind::Array, a.len() as u32, None),
        Value::String(s) => (NodeKind::String, 0, Some(truncate(s, PREVIEW_MAX))),
        Value::Number(n) => (NodeKind::Number, 0, Some(n.to_string())),
        Value::Bool(b) => (NodeKind::Bool, 0, Some(b.to_string())),
        Value::Null => (NodeKind::Null, 0, Some("null".to_string())),
    };

    nodes.push(Node {
        id,
        parent,
        key,
        kind,
        child_count,
        preview,
        children: 0..0,
    });

    // Recurse for containers and stitch the children range afterward.
    let kids_start = child_ids.len() as u32;
    match value {
        Value::Object(m) => {
            for (k, v) in m.iter() {
                let cid = walk(
                    v,
                    Some(id),
                    NodeKey::ObjectKey { key: k.clone() },
                    nodes,
                    child_ids,
                );
                child_ids.push(cid);
            }
        }
        Value::Array(a) => {
            for (i, v) in a.iter().enumerate() {
                let cid = walk(
                    v,
                    Some(id),
                    NodeKey::ArrayIndex { index: i as u32 },
                    nodes,
                    child_ids,
                );
                child_ids.push(cid);
            }
        }
        _ => {}
    }
    let kids_end = child_ids.len() as u32;

    // Note: children inside the range were pushed in insertion order, but
    // because of recursion the slice covers only direct children of `id`.
    // Each direct child's id was pushed onto `child_ids` after its own subtree
    // finished walking — so the slice [kids_start..kids_end] holds exactly
    // this node's direct children in document order.
    nodes[id as usize].children = kids_start..kids_end;

    id
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        return s.to_string();
    }
    let mut end = max;
    while !s.is_char_boundary(end) && end > 0 {
        end -= 1;
    }
    let mut out = String::with_capacity(end + 1);
    out.push_str(&s[..end]);
    out.push('…');
    out
}
