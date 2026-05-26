use serde_json::Value;
use serde_json_path::JsonPath;

use crate::error::AppError;
use crate::index::{Index, NodeKey};

const RESULT_CAP: usize = 5_000;

/// Case-insensitive substring scan over node keys + leaf previews.
/// Returns up to `RESULT_CAP` matching node ids in document order.
pub fn search_text(index: &Index, query: &str) -> Vec<u32> {
    let needle = query.to_lowercase();
    if needle.is_empty() {
        return Vec::new();
    }
    let mut out = Vec::new();
    for node in &index.nodes {
        let key_hit = match &node.key {
            NodeKey::ObjectKey { key } => key.to_lowercase().contains(&needle),
            _ => false,
        };
        let val_hit = node
            .preview
            .as_deref()
            .map(|p| p.to_lowercase().contains(&needle))
            .unwrap_or(false);
        if key_hit || val_hit {
            out.push(node.id);
            if out.len() >= RESULT_CAP {
                break;
            }
        }
    }
    out
}

/// Evaluate a JSONPath expression against the parsed Value and map each
/// resulting location back to a node id in the Index.
pub fn search_jsonpath(index: &Index, value: &Value, expr: &str) -> Result<Vec<u32>, AppError> {
    let path = JsonPath::parse(expr).map_err(|e| AppError::BadJsonPath(e.to_string()))?;
    let located = path.query_located(value);

    let mut out = Vec::new();
    for entry in located.iter() {
        let loc = entry.location();
        // PathElement order from root → leaf. Walk the Index in lockstep.
        let mut current = index.root;
        let mut matched = true;
        for elem in loc.iter() {
            let kids = index.children(current);
            let next = kids.iter().find_map(|cid| {
                let n = index.get(*cid)?;
                match (&n.key, elem) {
                    (NodeKey::ObjectKey { key }, serde_json_path::PathElement::Name(name))
                        if key.as_str() == *name =>
                    {
                        Some(*cid)
                    }
                    (NodeKey::ArrayIndex { index: i }, serde_json_path::PathElement::Index(idx))
                        if (*i as usize) == *idx =>
                    {
                        Some(*cid)
                    }
                    _ => None,
                }
            });
            match next {
                Some(c) => current = c,
                None => {
                    matched = false;
                    break;
                }
            }
        }
        if matched {
            out.push(current);
            if out.len() >= RESULT_CAP {
                break;
            }
        }
    }
    Ok(out)
}
