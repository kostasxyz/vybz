# Theme Module Reference

## Purpose

Vybz uses a small, Tailwind-free theme system built around:

- a persisted `themeTemplate`
- a persisted `themeMode` (`system`, `light`, `dark`)
- a persisted `terminalTheme`
- CSS custom properties in `src/App.css`
- an early `index.html` bootstrap to avoid a flash on launch

The current templates are:

- `native`
- `amber`
- `t3chat`
- `solar-dusk`

## Main Files

- `src/themes.ts`
  Holds theme IDs, template metadata, normalization helpers, mode resolution, DOM application, and the localStorage snapshot helpers.

- `src/context.tsx`
  Seeds initial state from the localStorage snapshot, applies the resolved theme to the document, reacts to system light/dark changes, and persists theme settings through the normal app store flow.

- `src/store.ts`
  Persists `themeMode` and `themeTemplate` in the Tauri store file alongside the rest of app state.

- `index.html`
  Runs a tiny bootstrap script before React mounts. It reads `vybz.theme` from localStorage, resolves `system` mode, and sets the root theme attributes/classes immediately.

- `src/App.css`
  Defines per-template light and dark variable blocks, terminal palette overrides, and consumes the semantic variables across the app chrome.

- `src/components/SettingsView.tsx`
  Renders the mode switcher, UI template picker, and terminal theme picker.

- `src/hooks/useTerminal.ts`
  Reads terminal-related CSS variables and updates xterm when the theme changes.

## Runtime Model

Theme state shape:

```ts
type ThemeMode = "system" | "light" | "dark";
type ThemeTemplateId = "native" | "amber" | "t3chat" | "solar-dusk";
type TerminalThemeId =
  | "match-ui"
  | "night-owl"
  | "solarized-light"
  | "solarized-dark"
  | "tokyo-night";

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

Every template defines two blocks:

- `:root[data-theme-template="<id>"]`
- `:root[data-theme-template="<id>"].dark`

Dedicated terminal palettes define one block each:

- `:root[data-terminal-theme="<id>"]`
- optionally `:root[data-terminal-theme="<id>"].dark` when the palette should vary with UI mode

The app chrome currently relies on these semantic tokens:

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
- `--font-sans`
- `--font-serif`
- `--font-mono`

Base radius variables are shared at the top of `src/App.css`:

- `--radius-xs`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`

## Terminal Theming

`src/hooks/useTerminal.ts` reads the terminal palette from CSS variables rather than hardcoding xterm colors.

Current variables used by xterm:

- `--terminal-background`
- `--terminal-foreground`
- `--terminal-cursor`
- `--terminal-cursor-accent`
- `--terminal-selection-background`
- `--terminal-selection-inactive-background`
- `--terminal-ansi-*`
- `--font-mono`

Theme changes are detected through a `MutationObserver` watching:

- `class`
- `data-theme-mode`
- `data-theme-template`
- `data-terminal-theme`

## Adding A New Template

1. Add the new ID to `ThemeTemplateId` in `src/themes.ts`.
2. Add a new entry to `THEME_TEMPLATES` in `src/themes.ts`.
   Include `id`, `name`, `description`, and `preview`.
3. Extend `isThemeTemplateId()` in `src/themes.ts`.
4. Extend the bootstrap allowlist in `index.html`.
   If this step is skipped, the theme will not restore correctly on refresh/app launch.
5. Add two CSS blocks to `src/App.css`:
   `:root[data-theme-template="<id>"]`
   `:root[data-theme-template="<id>"].dark`
6. Define the full token set used by the app chrome and terminal.
7. If the template depends on custom fonts, load those fonts separately.
   Setting `--font-sans` / `--font-mono` alone does not download them.

## Adding A Terminal Theme

1. Add the new ID to `TerminalThemeId` in `src/themes.ts`.
2. Add a new entry to `TERMINAL_THEMES` in `src/themes.ts`.
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
