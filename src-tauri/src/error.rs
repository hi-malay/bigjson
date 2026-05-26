use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io: {0}")]
    Io(String),
    #[error("parse: {0}")]
    Parse(String),
    #[error("no file open")]
    NoFile,
    #[error("invalid node id: {0}")]
    InvalidNode(u32),
    #[error("invalid jsonpath: {0}")]
    BadJsonPath(String),
}

// Tauri commands need errors that implement Serialize so they can cross the IPC.
impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
