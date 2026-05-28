use std::fs;
use std::path::Path;
use std::time::Instant;

use serde_json::Value;

use crate::error::AppError;

pub struct ParseOutcome {
    pub value: Value,
    pub size_bytes: u64,
    pub parse_ms: u64,
}

/// Read a JSON file from disk and parse it into a `serde_json::Value`.
///
/// Tries three strategies in order:
///   1. `simd-json` — fastest, mutates the input buffer.
///   2. `serde_json` — slower but accepts a few inputs simd-json rejects.
///   3. NDJSON / JSON Lines fallback — one JSON value per line. Wrapped in
///      a `Value::Array` so the rest of the viewer treats it like a normal
///      top-level array.
///
/// The third path is the common reason a file "fails to open" — log dumps
/// and analytics exports are usually NDJSON, not a single JSON value.
pub fn load_file(path: &Path) -> Result<ParseOutcome, AppError> {
    let size_bytes = fs::metadata(path)
        .map_err(|e| AppError::Io(format!("stat {}: {}", path.display(), e)))?
        .len();

    let bytes = fs::read(path)
        .map_err(|e| AppError::Io(format!("read {}: {}", path.display(), e)))?;

    let started = Instant::now();

    // 1) simd-json (mutates a clone so we can retry on failure)
    let mut buf = bytes.clone();
    let value: Value = match simd_json::serde::from_slice(&mut buf) {
        Ok(v) => v,
        Err(simd_err) => {
            // 2) serde_json against the untouched bytes
            match serde_json::from_slice::<Value>(&bytes) {
                Ok(v) => v,
                Err(serde_err) => {
                    // 3) NDJSON / JSON Lines
                    match parse_ndjson(&bytes) {
                        Some(v) => v,
                        None => {
                            return Err(AppError::Parse(format!(
                                "not valid JSON or NDJSON.\nsimd-json: {simd_err}\nserde_json: {serde_err}"
                            )))
                        }
                    }
                }
            }
        }
    };
    let parse_ms = started.elapsed().as_millis() as u64;

    Ok(ParseOutcome { value, size_bytes, parse_ms })
}

/// Try to interpret the byte buffer as NDJSON (one JSON value per line). Skips
/// blank lines and an optional UTF-8 BOM. Returns `None` if any non-empty line
/// fails to parse, or if there's only one usable line (in which case it isn't
/// really NDJSON and a parse error from earlier strategies is more useful).
fn parse_ndjson(bytes: &[u8]) -> Option<Value> {
    // strip UTF-8 BOM
    let slice = bytes.strip_prefix(b"\xef\xbb\xbf").unwrap_or(bytes);
    let text = std::str::from_utf8(slice).ok()?;

    let mut items = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let v: Value = serde_json::from_str(trimmed).ok()?;
        items.push(v);
    }
    if items.len() <= 1 {
        return None;
    }
    Some(Value::Array(items))
}
