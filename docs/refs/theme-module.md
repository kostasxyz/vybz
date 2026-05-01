# Theme Module Reference

## Purpose

Vybz uses a small theme system built around two registries:

- **Application themes** — named palettes with `background`, `foreground`, `accent`. Users can edit each theme's three colors; overrides persist per theme. Chrome CSS custom properties are derived at runtime from those three values.
- **Terminal themes** — named, fully predefined `xterm` `ITheme` objects (background, foreground, cursor, ANSI colors, etc.). Not user-editable. Selecting a terminal theme passes its full theme to xterm and writes `--terminal-background` / `--terminal-foreground` to `:root` for chrome that wraps the terminal.
- **Terminal background image** — optional uploaded image (data URL, persisted in the Tauri store, **not** in the localStorage snapshot due to size). Rendered via `.terminal-area::before` with `--terminal-bg-image` and `--terminal-bg-opacity` (0–1). xterm runs with `allowTransparency: true` and `theme.background = "rgba(0,0,0,0)"` so the image shows through behind the cells.

Bootstrap in `index.html` runs the same derivation/lookups before React mounts to avoid a flash.

Built-in themes:

- Application:
  - `absolutely` — `#2D2D2B` / `#F9F9F7` / `#CC7D5E`
  - `dracula` — `#282A36` / `#F8F8F2` / `#FF79C6`
  - `ayu` — `#0B0E14` / `#BFBDB6` / `#E6B450`
  - `rose-pine` — `#232136` / `#E0DEF4` / `#EA9A97`
  - `matrix` — `#040805` / `#B8FFCA` / `#1EFF5A`
- Terminal:
  - `xterm` — xterm.js's own default palette (background `#000000`, foreground `#ffffff`)
  - `ayu` — Ayu palette (background `#0B0E14`, foreground `#BFBDB6`)
  - `dracula` — Dracula iTerm2 palette
  - `rose-pine` — Rose Pine iTerm2 palette (background `#191724`, foreground `#E0DEF4`)
  - `matrix` — Matrix iTerm2 palette (background `#0F191C`, foreground `#426644`)

## Main Files

- `src/themes.ts`
  Registries (`APP_THEMES`, `TERMINAL_THEMES`), color derivation (`deriveThemeTokens`, `deriveTerminalTokens`), normalization, and DOM application (`applyThemeToDocument` writes both groups of tokens).

- `src/context.tsx`
  Seeds initial state from the localStorage snapshot and persists settings through the normal app store flow. The `syncTheme` effect re-applies tokens whenever any theme field changes.

- `src/store.ts`
  Persists `activeThemeId`, `themeColors`, `activeTerminalThemeId`, `terminalThemeColors`.

- `index.html`
  Inlines the same color derivation so the page renders styled before React mounts. Sets `data-theme-id` and `data-terminal-theme-id` on `:root`.

- `src/App.css`
  Holds base radii and **fallback** terminal CSS vars (used until JS runs). All other tokens are written inline by JS.

- `src/components/SettingsView.tsx`
  Two `ThemePicker` instances — Application Theme and Terminal Theme — each with a dropdown plus three color rows.

- `src/hooks/useTerminal.ts`
  `syncTerminalTheme(term)` reads `--terminal-*` CSS vars and applies them to the xterm instance. A `MutationObserver` on `data-terminal-theme-id` and `style` keeps it in sync with edits.

## Runtime Model

```ts
interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
}

interface AppTheme {
  id: string;
  name: string;
  defaults: ThemeColors;
}

interface TerminalTheme {
  id: string;
  name: string;
  theme: ITheme & { background: string; foreground: string };
}

interface ThemeSettings {
  activeThemeId: string;
  themeColors: Record<string, ThemeColors>;
  activeTerminalThemeId: string;
  terminalBackgroundImage: string | null; // data URL
  terminalBackgroundOpacity: number; // 0..100
}
```

`getThemeColors` / `getTerminalThemeColors` resolve overrides against defaults (empty strings fall back to defaults).

## Document State

- `dataset.themeId` — active app theme id
- `dataset.terminalThemeId` — active terminal theme id
- `.dark` class + `colorScheme` — derived from app background luminance
- All semantic CSS variables set inline via `root.style.setProperty(...)`

## CSS Contract

Application chrome tokens (set inline at runtime):

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--border`, `--input`, `--ring`
- `--sidebar`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`
- `--surface-hover`, `--surface-active`, `--surface-elevated`, `--surface-strong`
- `--text-secondary`, `--text-muted`, `--text-on-accent`
- `--shadow-popover`, `--shadow-floating`

Terminal tokens (set inline at runtime; `:root` also defines defaults so chrome that references them works pre-hydration):

- `--terminal-background`, `--terminal-foreground`
- `--terminal-cursor`, `--terminal-cursor-accent`
- `--terminal-selection-background`, `--terminal-selection-inactive-background`

`--font-sans`, `--font-mono`, and `--radius-*` stay in `:root` in `src/App.css`.

## Adding A New Theme

App theme:
1. Append an entry to `APP_THEMES` in `src/themes.ts` with `id`, `name`, and `defaults` (background, foreground, accent).
2. Mirror the entry in the `APP_THEMES` array in the bootstrap script in `index.html`.

Terminal theme:
1. Append an entry to `TERMINAL_THEMES` in `src/themes.ts` with `id`, `name`, and a full xterm `ITheme` (at minimum `background` and `foreground`; ANSI colors etc. optional — xterm fills the rest with its defaults).
2. Mirror the entry in the `TERMINAL_THEMES` array in the bootstrap script in `index.html` (only `id`, `background`, `foreground` are needed there for chrome bootstrap).

The dropdowns pick the new entry up automatically.
