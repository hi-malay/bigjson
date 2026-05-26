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
/// Uses `simd-json` for the parse — it mutates the input buffer in place
/// (zero-copy slices for strings where possible) and is several times faster
/// than vanilla `serde_json` on large inputs. Falls back to `serde_json`
/// only if simd-json fails (very rare; usually means input is genuinely
/// malformed, in which case serde_json will fail too with a better error).
pub fn load_file(path: &Path) -> Result<ParseOutcome, AppError> {
    let size_bytes = fs::metadata(path)
        .map_err(|e| AppError::Io(format!("stat {}: {}", path.display(), e)))?
        .len();

    let mut bytes = fs::read(path)
        .map_err(|e| AppError::Io(format!("read {}: {}", path.display(), e)))?;

    let started = Instant::now();
    let value: Value = match simd_json::serde::from_slice(&mut bytes) {
        Ok(v) => v,
        Err(simd_err) => {
            // simd-json mutates the buffer, so re-read for the fallback.
            let raw = fs::read(path)
                .map_err(|e| AppError::Io(format!("re-read {}: {}", path.display(), e)))?;
            serde_json::from_slice(&raw)
                .map_err(|serde_err| AppError::Parse(format!(
                    "simd-json: {simd_err}; serde_json: {serde_err}"
                )))?
        }
    };
    let parse_ms = started.elapsed().as_millis() as u64;

    Ok(ParseOutcome { value, size_bytes, parse_ms })
}
