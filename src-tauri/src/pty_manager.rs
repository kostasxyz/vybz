use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::Command;
use std::sync::Mutex;
use std::thread::{self, JoinHandle};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use tauri::ipc::Channel;
use uuid::Uuid;

const DEFAULT_TERM: &str = "xterm-256color";

/// Capture the user's interactive shell environment so spawned PTY children
/// see the same PATH and other env vars they would in a normal terminal
/// session. Bundled .app launches inherit only launchd's minimal env, which
/// is missing Homebrew, mise/fnm/nvm, language-specific paths, and locale —
/// causing TUI tools like Claude Code to die immediately on first I/O.
fn capture_user_env() -> Vec<(String, String)> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    // -i (interactive) sources .zshrc / .bashrc, -l (login) sources
    // .zprofile / .zlogin / .profile. We dump the resulting env via
    // `printenv` (more portable than `export -p`) wrapped with sentinels
    // so we can parse a clean block even if dotfiles emit greetings.
    let script = "printf '__VYBZ_ENV_BEGIN__\\n'; printenv; printf '__VYBZ_ENV_END__\\n'";
    let output = Command::new(&shell)
        .arg("-ilc")
        .arg(script)
        .output();

    let Ok(output) = output else {
        eprintln!("[vybz] failed to launch shell to capture env");
        return Vec::new();
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut env = Vec::new();
    let mut in_block = false;
    for line in stdout.lines() {
        if line == "__VYBZ_ENV_BEGIN__" {
            in_block = true;
            continue;
        }
        if line == "__VYBZ_ENV_END__" {
            break;
        }
        if !in_block {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            // Skip a few that we set ourselves or that should not be
            // inherited from the user shell snapshot.
            if matches!(key, "_" | "OLDPWD" | "PWD" | "SHLVL") {
                continue;
            }
            env.push((key.to_string(), value.to_string()));
        }
    }

    eprintln!("[vybz] captured {} user env vars", env.len());
    env
}

struct Session {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    reader_thread: Option<JoinHandle<()>>,
}

pub struct PtyManager {
    sessions: Mutex<HashMap<String, Session>>,
    user_env: Vec<(String, String)>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            user_env: capture_user_env(),
        }
    }

    pub fn spawn_session(
        &self,
        cwd: &str,
        cols: u16,
        rows: u16,
        startup_command: Option<String>,
        channel: Channel<Vec<u8>>,
        exit_channel: Channel<bool>,
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

        // Apply the user-shell environment we captured at app startup so
        // PATH, locale, language tooling, etc. match what the user sees in
        // their normal terminal. Without this, bundled .app launches inherit
        // only launchd's minimal env and most CLI tools fail to start.
        for (key, value) in &self.user_env {
            cmd.env(key, value);
        }

        if cmd.get_env("TERM").is_none() {
            cmd.env("TERM", DEFAULT_TERM);
        }

        // When a startup command is supplied, exec it through the shell
        // with `-c 'exec <cmd>'`. The `exec` prefix tells the shell to
        // replace itself with the command rather than fork it as a child,
        // so the tool inherits the shell's PID, session, and PTY ownership
        // directly. Without this, non-interactive zsh doesn't set up job
        // control / terminal-group transfer, and TUI tools (Claude Code,
        // Codex, etc.) bail when they can't take control of the terminal.
        if let Some(startup) = startup_command.as_deref().map(str::trim) {
            if !startup.is_empty() {
                cmd.arg("-c");
                cmd.arg(format!("exec {}", startup));
            }
        }

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

            let _ = exit_channel.send(true);
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
