use std::process::Command;
use tauri::{ipc::Channel, State};

use crate::pty_manager::PtyManager;

#[tauri::command]
pub fn spawn_terminal(
    state: State<'_, PtyManager>,
    cwd: String,
    cols: u16,
    rows: u16,
    on_data: Channel<Vec<u8>>,
) -> Result<String, String> {
    state.spawn_session(&cwd, cols, rows, on_data)
}

#[tauri::command]
pub fn write_to_terminal(
    state: State<'_, PtyManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    state.write_to_session(&session_id, &data)
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, PtyManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize_session(&session_id, cols, rows)
}

#[tauri::command]
pub fn kill_terminal(
    state: State<'_, PtyManager>,
    session_id: String,
) -> Result<(), String> {
    state.kill_session(&session_id)
}

#[tauri::command]
pub fn open_in_editor(editor: String, path: String) -> Result<(), String> {
    Command::new("/bin/zsh")
        .arg("-l")
        .arg("-c")
        .arg(format!("{} \"$@\"", editor))
        .arg("_")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open {}: {}", editor, e))
}
