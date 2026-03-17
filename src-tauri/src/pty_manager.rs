use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread::{self, JoinHandle};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use tauri::ipc::Channel;
use uuid::Uuid;

struct Session {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    reader_thread: Option<JoinHandle<()>>,
}

pub struct PtyManager {
    sessions: Mutex<HashMap<String, Session>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn_session(
        &self,
        cwd: &str,
        cols: u16,
        rows: u16,
        channel: Channel<Vec<u8>>,
    ) -> Result<String, String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(cwd);

        let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        // Drop the slave so EOF propagates correctly
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let reader_thread = thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        if channel.send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        let id = Uuid::new_v4().to_string();

        self.sessions.lock().unwrap().insert(
            id.clone(),
            Session {
                writer,
                master: pair.master,
                child,
                reader_thread: Some(reader_thread),
            },
        );

        Ok(id)
    }

    pub fn write_to_session(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let session = sessions.get_mut(id).ok_or("Session not found")?;
        session.writer.write_all(data).map_err(|e| e.to_string())
    }

    pub fn resize_session(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(id).ok_or("Session not found")?;
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    pub fn kill_session(&self, id: &str) -> Result<(), String> {
        let session = {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.remove(id)
        };
        if let Some(mut session) = session {
            let _ = session.child.kill();
            if let Some(handle) = session.reader_thread.take() {
                let _ = handle.join();
            }
        }
        Ok(())
    }

    pub fn kill_all(&self) {
        let sessions: Vec<(String, Session)> = {
            let mut map = self.sessions.lock().unwrap();
            map.drain().collect()
        };
        for (_, mut session) in sessions {
            let _ = session.child.kill();
            if let Some(handle) = session.reader_thread.take() {
                let _ = handle.join();
            }
        }
    }
}
