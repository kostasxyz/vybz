# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this

**Vybz** — a Tauri v2 desktop app for managing multiple project terminal sessions. React 19 + TypeScript frontend, Rust backend with `portable-pty` for PTY management. Each project gets color-coded sidebar entry with tabbed terminals that can run shells or AI coding tools (Claude, Codex, OpenCode, Pi).

## Commands

```bash
# Development (starts both Vite dev server and Tauri window)
pnpm tauri dev

# Build production app
pnpm tauri build

# Frontend-only dev server (port 1420)
pnpm dev

# Type-check + build frontend
pnpm build

# Rust backend only (from src-tauri/)
cargo build        # debug
cargo build --release
```

Package manager is **pnpm**. No test framework or linter configured.

## Architecture

### Frontend (`src/`)

State management uses **useReducer + React Context** — no external state library.

- `types.ts` — All shared types: `Project`, `Tab`, `AppState`, `Action` (discriminated union). `ToolType` defines supported terminal tools.
- `context.tsx` — `AppProvider` wraps the app, holds the reducer, hydrates from store on mount, auto-persists each state slice via effects.
- `store.ts` — Thin wrapper around `@tauri-apps/plugin-store`, all data lives in a single `projects.json` store file.
- `hooks/useTerminal.ts` — Manages xterm.js Terminal lifecycle: spawns PTY via Tauri IPC, bridges input/output through `Channel<Vec<u8>>`, handles resize via `ResizeObserver` + `FitAddon`, cleans up on unmount.

Components:
- `App.tsx` — Wraps `AppProvider` → `Sidebar` + `MainArea`
- `Sidebar.tsx` — Project list, add via folder picker (`@tauri-apps/plugin-dialog`), inline rename, color picker
- `MainArea.tsx` — Orchestrates tab creation, keyboard shortcuts (Cmd+T/W, Cmd+±/0 for font), renders all `TerminalView`s (kept alive, toggled via `display:none`)
- `TabBar.tsx` — Tab strip + dropdowns for tool selection, editor launch, and per-project command runner. Exports `TOOL_COMMANDS` map.
- `TerminalView.tsx` — Thin wrapper: ref container → `useTerminal` hook
- `SettingsView.tsx` — UI font size control
- `ProjectSettingsView.tsx` — Per-project custom command management

### Backend (`src-tauri/src/`)

- `lib.rs` — Tauri app setup: registers plugins (opener, store, dialog), manages `PtyManager` as app state, registers IPC commands, kills all PTYs on window destroy.
- `commands.rs` — Five `#[tauri::command]` functions: `spawn_terminal`, `write_to_terminal`, `resize_terminal`, `kill_terminal`, `open_in_editor`.
- `pty_manager.rs` — `PtyManager` struct with `Mutex<HashMap<String, Session>>`. Each session holds a PTY master, writer, child process, and reader thread that streams output back to frontend via Tauri `Channel`.

### Frontend ↔ Backend IPC

Terminal data flows as `Vec<u8>` (byte arrays). Frontend uses `@tauri-apps/api/core` `invoke()` for commands and `Channel` for streaming PTY output back. The `useTerminal` hook converts between xterm string data and byte arrays via `TextEncoder`.

## Conventions

- All styling in a single `src/App.css` — no CSS modules or framework
- Icons from `@lobehub/icons` (AI tool logos) + inline SVGs
- Tab IDs generated via timestamp counter, project IDs via `crypto.randomUUID()`
- Terminal sessions identified by UUID v4 (Rust side)
- State persistence is eager: each slice auto-saves on change after initial hydration
