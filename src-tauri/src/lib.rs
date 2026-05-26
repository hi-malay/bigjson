mod commands;
mod error;
mod index;
mod parser;
mod search;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::close_file,
            commands::get_node,
            commands::get_children,
            commands::get_ancestors,
            commands::get_value,
            commands::get_path,
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
