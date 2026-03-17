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

## Reference Index

Use `docs/refs/` for durable implementation references that should survive beyond a single plan or task.

- `docs/refs/theme-module.md` — Theme system reference: state model, persistence/bootstrap flow, CSS token contract, terminal theming, and the checklist for adding new templates.

When new reference docs are added under `docs/refs/`, update this index in the same change.

## Architecture

### Frontend (`src/`)

State management uses **useReducer + React Context** — no external state library.

- `types.ts` — Shared types: `Project`, `Tab`, `AppState`, `Action` (discriminated union). `ToolType` defines supported terminal tools; theme mode/template are part of app state.
- `themes.ts` — Theme registry and helpers: template metadata, mode resolution, DOM application, and localStorage snapshot/bootstrap support.
- `context.tsx` — `AppProvider` wraps the app, holds the reducer, hydrates from store on mount, auto-persists app state, and applies the resolved theme to the document.
- `store.ts` — Thin wrapper around `@tauri-apps/plugin-store`, all persisted UI/project state lives in a single `projects.json` store file.
- `hooks/useTerminal.ts` — Manages xterm.js Terminal lifecycle: spawns PTY via Tauri IPC, bridges input/output through `Channel<Vec<u8>>`, handles resize via `ResizeObserver` + `FitAddon`, syncs xterm colors/fonts from CSS theme variables, and delays startup tool commands until shell output settles.

Components:
- `App.tsx` — Wraps `AppProvider` → `Sidebar` + `MainArea`
- `Sidebar.tsx` — Project list, add via folder picker (`@tauri-apps/plugin-dialog`), inline rename, and project color management
- `ProjectColorPicker.tsx` — Custom in-app project badge color picker (preset swatches + hue/SV/hex editor), used instead of the native OS color input
- `MainArea.tsx` — Orchestrates tab creation, keyboard shortcuts (Cmd+T/W, Cmd+±/0 for font), and lazy-loads terminal panel rendering
- `TerminalPanels.tsx` — Renders all `TerminalView`s and keeps them mounted while toggling visibility by active tab/view
- `TabBar.tsx` — Tab strip + dropdowns for tool selection, editor launch, and per-project command runner. Exports `TOOL_COMMANDS` map.
- `TerminalView.tsx` — Thin wrapper: ref container → `useTerminal` hook
- `SettingsView.tsx` — Appearance controls: theme mode, theme template selection, and UI font size
- `ProjectSettingsView.tsx` — Per-project custom command management

### Backend (`src-tauri/src/`)

- `lib.rs` — Tauri app setup: registers plugins (opener, store, dialog), manages `PtyManager` as app state, registers IPC commands, kills all PTYs on window destroy.
- `commands.rs` — Five `#[tauri::command]` functions: `spawn_terminal`, `write_to_terminal`, `resize_terminal`, `kill_terminal`, `open_in_editor`.
- `pty_manager.rs` — `PtyManager` struct with `Mutex<HashMap<String, Session>>`. Each session holds a PTY master, writer, child process, and reader thread that streams output back to frontend via Tauri `Channel`.

### Frontend ↔ Backend IPC

Terminal data flows as `Vec<u8>` (byte arrays). Frontend uses `@tauri-apps/api/core` `invoke()` for commands and `Channel` for streaming PTY output back. The `useTerminal` hook converts between xterm string data and byte arrays via `TextEncoder`.

## Conventions

- Styling lives in `src/App.css` and is driven by CSS custom properties; theme templates are registered in `src/themes.ts`
- Theme application uses both the Tauri store and a small `localStorage` snapshot (`vybz.theme`) so the selected template/mode applies before React hydrates
- Theme templates must define both light and dark variable blocks in `src/App.css`; see `docs/refs/theme-module.md` for the token contract and add-template checklist
- Icons from `@lobehub/icons` (AI tool logos) + inline SVGs
- Tab IDs generated via timestamp counter, project IDs via `crypto.randomUUID()`
- Terminal sessions identified by UUID v4 (Rust side)
- State persistence is eager: each slice auto-saves on change after initial hydration
