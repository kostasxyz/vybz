mod commands;
mod pty_manager;

use commands::{kill_terminal, open_in_editor, resize_terminal, spawn_terminal, write_to_terminal};
use pty_manager::PtyManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyManager::new())
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_to_terminal,
            resize_terminal,
            kill_terminal,
            open_in_editor,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let manager: tauri::State<PtyManager> = window.state();
                manager.kill_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
