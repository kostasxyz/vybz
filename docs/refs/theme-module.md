# Theme Module Reference

## Purpose

Vybz uses a small, Tailwind-free theme system built around:

- a persisted `themeTemplate`
- a persisted `themeMode` (`system`, `light`, `dark`)
- a persisted `terminalTheme`
- CSS custom properties in `src/App.css`
- an early `index.html` bootstrap to avoid a flash on launch

The current UI templates are:

- `native`
- `amber`
- `t3chat`
- `solar-dusk`
- `synthwave`

The current terminal themes are:

- `night-owl`
- `solarized-dark`
- `solarized-light`
- `tokyo-night`
- `synthwave`

## Main Files

- `src/themes.ts`
  Holds UI template IDs, terminal theme IDs, metadata, normalization helpers, mode resolution, DOM application, and the localStorage snapshot helpers.

- `src/context.tsx`
  Seeds initial state from the localStorage snapshot, applies the resolved theme to the document, reacts to system light/dark changes, and persists theme settings through the normal app store flow.

- `src/store.ts`
  Persists `themeMode`, `themeTemplate`, and `terminalTheme` in the Tauri store file alongside the rest of app state.

- `index.html`
  Runs a tiny bootstrap script before React mounts. It reads `vybz.theme` from localStorage, resolves `system` mode, and sets the root theme attributes/classes immediately.

- `src/App.css`
  Defines per-template light and dark variable blocks, dedicated terminal palette blocks, and consumes the semantic variables across the app chrome.

- `src/components/SettingsView.tsx`
  Renders the mode switcher, UI template picker, and terminal theme picker.

- `src/hooks/useTerminal.ts`
  Reads terminal-related CSS variables and updates xterm when the theme changes.

## Runtime Model

Theme state shape:

```ts
type ThemeMode = "system" | "light" | "dark";
type ThemeTemplateId =
  | "native"
  | "amber"
  | "t3chat"
  | "solar-dusk"
  | "synthwave";
type TerminalThemeId =
  | "night-owl"
  | "solarized-dark"
  | "solarized-light"
  | "tokyo-night"
  | "synthwave";

interface ThemeSettings {
  themeMode: ThemeMode;
  themeTemplate: ThemeTemplateId;
  terminalTheme: TerminalThemeId;
}
```

Resolved mode behavior:

- `light` stays `light`
- `dark` stays `dark`
- `system` resolves from `matchMedia("(prefers-color-scheme: dark)")`

Document state applied by `applyThemeToDocument()`:

- `document.documentElement.dataset.themeTemplate = "<template>"`
- `document.documentElement.dataset.terminalTheme = "<terminal-theme>"`
- `document.documentElement.dataset.themeMode = "<resolved-mode>"`
- root `.dark` class toggled when resolved mode is dark
- `color-scheme` set on the root

## Persistence

There are two persistence layers on purpose:

1. Tauri store
   Source of truth after hydration.
   Keys live in `projects.json` through `src/store.ts`.

2. localStorage snapshot
   Key: `vybz.theme`
   Used only for instant pre-hydration bootstrap in `index.html`.

The app writes both whenever the theme changes.

## CSS Contract

Every UI template defines two blocks:

- `:root[data-theme-template="<id>"]`
- `:root[data-theme-template="<id>"].dark`

Terminal themes define one block each and own the terminal color tokens:

- `:root[data-terminal-theme="<id>"]`

Important separation:

- UI template blocks define app chrome tokens.
- Terminal theme blocks define terminal-only tokens.
- UI template blocks should not override `--terminal-*` tokens.

The UI chrome relies on these semantic tokens:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--border`
- `--input`
- `--ring`
- `--sidebar`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-primary-foreground`
- `--sidebar-accent`
- `--sidebar-accent-foreground`
- `--sidebar-border`
- `--sidebar-ring`
- `--surface-hover`
- `--surface-active`
- `--surface-elevated`
- `--surface-strong`
- `--text-secondary`
- `--text-muted`
- `--text-on-accent`
- `--shadow-popover`
- `--shadow-floating`
- `--font-sans`
- `--font-serif`
- `--font-mono`

The terminal palette relies on these tokens:

- `--terminal-background`
- `--terminal-foreground`
- `--terminal-cursor`
- `--terminal-cursor-accent`
- `--terminal-selection-background`
- `--terminal-selection-inactive-background`
- `--terminal-ansi-black`
- `--terminal-ansi-red`
- `--terminal-ansi-green`
- `--terminal-ansi-yellow`
- `--terminal-ansi-blue`
- `--terminal-ansi-magenta`
- `--terminal-ansi-cyan`
- `--terminal-ansi-white`
- `--terminal-ansi-bright-black`
- `--terminal-ansi-bright-red`
- `--terminal-ansi-bright-green`
- `--terminal-ansi-bright-yellow`
- `--terminal-ansi-bright-blue`
- `--terminal-ansi-bright-magenta`
- `--terminal-ansi-bright-cyan`
- `--terminal-ansi-bright-white`
- `--font-mono`

Base radius variables are shared at the top of `src/App.css`:

- `--radius-xs`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`

## Terminal Theming

`src/hooks/useTerminal.ts` reads the terminal palette from CSS variables rather than hardcoding xterm colors.

UI templates and terminal themes are independent selections. Each terminal theme defines its own palette, independent of the UI mode.

Theme changes are detected through a `MutationObserver` watching:

- `class`
- `data-theme-mode`
- `data-theme-template`
- `data-terminal-theme`

Because the terminal hook re-reads CSS custom properties on attribute changes, changing either the UI template or terminal theme propagates immediately without recreating the xterm instance.

## Adding A New UI Template

1. Add the new ID to `ThemeTemplateId` in `src/themes.ts`.
2. Add a new entry to `THEME_TEMPLATES` in `src/themes.ts`.
   Include `id`, `name`, `description`, and `preview`.
3. Extend `isThemeTemplateId()` in `src/themes.ts`.
4. Extend the bootstrap allowlist in `index.html`.
   If this step is skipped, the theme will not restore correctly on refresh/app launch.
5. Add two CSS blocks to `src/App.css`:
   `:root[data-theme-template="<id>"]`
   `:root[data-theme-template="<id>"].dark`
6. Define the full token set used by the app chrome.
7. If the template depends on custom fonts, load those fonts separately.
   Setting `--font-sans` / `--font-mono` alone does not download them.
8. Do not set `--terminal-*` tokens in the UI template blocks.

## Adding A Terminal Theme

1. Add the new ID to `TerminalThemeId` in `src/themes.ts`.
2. Add a new entry to `TERMINAL_THEMES` in `src/themes.ts`.
   Include `id`, `name`, `description`, and `preview` with `background`, `foreground`, and `accent` colors.
3. Extend `isTerminalThemeId()` in `src/themes.ts`.
4. Extend the bootstrap allowlist in `index.html`.
   If this step is skipped, the terminal palette will not restore correctly on app launch.
5. Add a CSS block to `src/App.css`:
   `:root[data-terminal-theme="<id>"]`
6. Define the terminal tokens used by xterm for background, cursor, selection, and ANSI colors.

## Notes

- This system is intentionally independent from Tailwind.
- The token naming shape is compatible with design-template imports, but the app itself is driven by plain CSS variables.
- `native` dark mode is intended to preserve the original Vybz look as closely as possible.
- Terminal themes are independent of UI templates and light/dark mode.