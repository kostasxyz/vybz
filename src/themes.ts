import type { ITheme } from "@xterm/xterm";

export interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
}

export interface AppTheme {
  id: string;
  name: string;
  defaults: ThemeColors;
}

export interface TerminalTheme {
  id: string;
  name: string;
  theme: ITheme & { background: string; foreground: string };
}

export interface ThemeSettings {
  activeThemeId: string;
  themeColors: Record<string, ThemeColors>;
  activeTerminalThemeId: string;
  terminalBackgroundColor: string | null;
  terminalBackgroundImage: string | null;
  terminalBackgroundOpacity: number;
}

export const DEFAULT_TERMINAL_BACKGROUND_OPACITY = 33;

export const THEME_STORAGE_KEY = "vybz.theme";

export const APP_THEMES: AppTheme[] = [
  {
    id: "absolutely",
    name: "Absolutely",
    defaults: {
      background: "#2D2D2B",
      foreground: "#F9F9F7",
      accent: "#CC7D5E",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    defaults: {
      background: "#282A36",
      foreground: "#F8F8F2",
      accent: "#FF79C6",
    },
  },
  {
    id: "ayu",
    name: "Ayu",
    defaults: {
      background: "#0B0E14",
      foreground: "#BFBDB6",
      accent: "#E6B450",
    },
  },
  {
    id: "rose-pine",
    name: "Rose Pine",
    defaults: {
      background: "#232136",
      foreground: "#E0DEF4",
      accent: "#EA9A97",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    defaults: {
      background: "#040805",
      foreground: "#B8FFCA",
      accent: "#1EFF5A",
    },
  },
];

export const TERMINAL_THEMES: TerminalTheme[] = [
  {
    id: "xterm",
    name: "xTerm",
    theme: {
      background: "#000000",
      foreground: "#ffffff",
    },
  },
  {
    id: "ayu",
    name: "Ayu",
    theme: {
      background: "#0B0E14",
      foreground: "#BFBDB6",
      cursor: "#E6B450",
      cursorAccent: "#0B0E14",
      selectionBackground: "#409FFF",
      black: "#11151C",
      red: "#EA6C73",
      green: "#7FD962",
      yellow: "#F9AF4F",
      blue: "#53BDFA",
      magenta: "#CDA1FA",
      cyan: "#90E1C6",
      white: "#C7C7C7",
      brightBlack: "#686868",
      brightRed: "#F07178",
      brightGreen: "#AAD94C",
      brightYellow: "#FFB454",
      brightBlue: "#59C2FF",
      brightMagenta: "#D2A6FF",
      brightCyan: "#95E6CB",
      brightWhite: "#FFFFFF",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    theme: {
      background: "#282A36",
      foreground: "#F8F8F2",
      cursor: "#F8F8F2",
      cursorAccent: "#282A36",
      selectionBackground: "#44475A",
      black: "#21222C",
      red: "#FF5555",
      green: "#50FA7B",
      yellow: "#F1FA8C",
      blue: "#BD93F9",
      magenta: "#FF79C6",
      cyan: "#8BE9FD",
      white: "#F8F8F2",
      brightBlack: "#6272A4",
      brightRed: "#FF6E6E",
      brightGreen: "#69FF94",
      brightYellow: "#FFFFA5",
      brightBlue: "#D6ACFF",
      brightMagenta: "#FF92DF",
      brightCyan: "#A4FFFF",
      brightWhite: "#FFFFFF",
    },
  },
  {
    id: "rose-pine",
    name: "Rose Pine",
    theme: {
      background: "#191724",
      foreground: "#E0DEF4",
      cursor: "#E0DEF4",
      cursorAccent: "#191724",
      selectionBackground: "#403D52",
      black: "#26233A",
      red: "#EB6F92",
      green: "#31748F",
      yellow: "#F6C177",
      blue: "#9CCFD8",
      magenta: "#C4A7E7",
      cyan: "#EBBCBA",
      white: "#E0DEF4",
      brightBlack: "#6E6A86",
      brightRed: "#EB6F92",
      brightGreen: "#31748F",
      brightYellow: "#F6C177",
      brightBlue: "#9CCFD8",
      brightMagenta: "#C4A7E7",
      brightCyan: "#EBBCBA",
      brightWhite: "#E0DEF4",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    theme: {
      background: "#0F191C",
      foreground: "#426644",
      cursor: "#384545",
      cursorAccent: "#00FF00",
      selectionBackground: "#18282E",
      black: "#0F191C",
      red: "#23755A",
      green: "#82D967",
      yellow: "#FFD700",
      blue: "#3F5242",
      magenta: "#409931",
      cyan: "#50B45A",
      white: "#507350",
      brightBlack: "#688060",
      brightRed: "#2FC079",
      brightGreen: "#90D762",
      brightYellow: "#FAFF00",
      brightBlue: "#4F7E7E",
      brightMagenta: "#11FF25",
      brightCyan: "#C1FF8A",
      brightWhite: "#678C61",
    },
  },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  activeThemeId: APP_THEMES[0].id,
  themeColors: {},
  activeTerminalThemeId: TERMINAL_THEMES[0].id,
  terminalBackgroundColor: null,
  terminalBackgroundImage: null,
  terminalBackgroundOpacity: DEFAULT_TERMINAL_BACKGROUND_OPACITY,
};

export function getAppTheme(id: string): AppTheme {
  return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];
}

export function getTerminalTheme(id: string): TerminalTheme {
  return TERMINAL_THEMES.find((t) => t.id === id) ?? TERMINAL_THEMES[0];
}

export function getThemeColors(
  id: string,
  overrides: Record<string, ThemeColors> | undefined,
): ThemeColors {
  const theme = getAppTheme(id);
  const stored = overrides?.[theme.id];
  if (!stored) return theme.defaults;
  return {
    background: stored.background || theme.defaults.background,
    foreground: stored.foreground || theme.defaults.foreground,
    accent: stored.accent || theme.defaults.accent,
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, "");
  if (/^[\da-fA-F]{3}$/.test(h)) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[\da-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const ch = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

function safeParse(hex: string, fallback = "#000000") {
  return parseHex(hex) ?? parseHex(fallback)!;
}

function mix(a: string, b: string, t: number): string {
  const A = safeParse(a);
  const B = safeParse(b);
  return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

function luminance(hex: string): number {
  const { r, g, b } = safeParse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.55;
}

function shadow(bg: string, opacityDark: number, opacityLight: number, spread: string) {
  if (isLight(bg)) {
    return `${spread} rgba(15, 23, 42, ${opacityLight})`;
  }
  return `${spread} rgba(0, 0, 0, ${opacityDark})`;
}

export function deriveThemeTokens(c: ThemeColors): Record<string, string> {
  const { background: bg, foreground: fg, accent: ac } = c;
  const onAccent = isLight(ac) ? "#000000" : "#ffffff";

  return {
    "--background": bg,
    "--foreground": fg,
    "--card": mix(bg, fg, 0.04),
    "--card-foreground": fg,
    "--popover": mix(bg, fg, 0.06),
    "--popover-foreground": fg,
    "--primary": ac,
    "--primary-foreground": onAccent,
    "--secondary": mix(bg, fg, 0.08),
    "--secondary-foreground": fg,
    "--muted": mix(bg, fg, 0.04),
    "--muted-foreground": mix(fg, bg, 0.45),
    "--accent": mix(bg, fg, 0.08),
    "--accent-foreground": fg,
    "--border": mix(bg, fg, 0.14),
    "--input": mix(bg, fg, 0.18),
    "--ring": ac,
    "--sidebar": bg,
    "--sidebar-foreground": mix(fg, bg, 0.3),
    "--sidebar-primary": ac,
    "--sidebar-primary-foreground": onAccent,
    "--sidebar-accent": mix(bg, fg, 0.08),
    "--sidebar-accent-foreground": fg,
    "--sidebar-border": mix(bg, fg, 0.1),
    "--sidebar-ring": ac,
    "--surface-hover": mix(bg, fg, 0.06),
    "--surface-active": mix(bg, fg, 0.12),
    "--surface-elevated": mix(bg, fg, 0.04),
    "--surface-strong": mix(bg, fg, 0.16),
    "--text-secondary": mix(fg, bg, 0.3),
    "--text-muted": mix(fg, bg, 0.5),
    "--text-on-accent": onAccent,
    "--shadow-popover": shadow(bg, 0.5, 0.15, "0 4px 12px"),
    "--shadow-floating": shadow(bg, 0.45, 0.12, "0 8px 24px"),
  };
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeColors(value: unknown): value is ThemeColors {
  if (!isStringRecord(value)) return false;
  return (
    typeof value.background === "string" &&
    typeof value.foreground === "string" &&
    typeof value.accent === "string"
  );
}

function isThemeColorsMap(value: unknown): value is Record<string, ThemeColors> {
  if (!isStringRecord(value)) return false;
  return Object.values(value).every(isThemeColors);
}

export function isAppThemeId(value: unknown): value is string {
  return typeof value === "string" && APP_THEMES.some((t) => t.id === value);
}

export function isTerminalThemeId(value: unknown): value is string {
  return typeof value === "string" && TERMINAL_THEMES.some((t) => t.id === value);
}

function clampOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_THEME_SETTINGS.terminalBackgroundOpacity;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isImageString(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" && value.length > 0;
}

function isOptionalColor(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" && value.length > 0;
}

export function normalizeThemeSettings(
  value: Partial<ThemeSettings> | null | undefined,
): ThemeSettings {
  return {
    activeThemeId: isAppThemeId(value?.activeThemeId)
      ? value.activeThemeId
      : DEFAULT_THEME_SETTINGS.activeThemeId,
    themeColors: isThemeColorsMap(value?.themeColors)
      ? value.themeColors
      : DEFAULT_THEME_SETTINGS.themeColors,
    activeTerminalThemeId: isTerminalThemeId(value?.activeTerminalThemeId)
      ? value.activeTerminalThemeId
      : DEFAULT_THEME_SETTINGS.activeTerminalThemeId,
    terminalBackgroundColor: isOptionalColor(value?.terminalBackgroundColor)
      ? value.terminalBackgroundColor
      : DEFAULT_THEME_SETTINGS.terminalBackgroundColor,
    terminalBackgroundImage: isImageString(value?.terminalBackgroundImage)
      ? value.terminalBackgroundImage
      : DEFAULT_THEME_SETTINGS.terminalBackgroundImage,
    terminalBackgroundOpacity: clampOpacity(value?.terminalBackgroundOpacity),
  };
}

export function applyThemeToDocument(settings: ThemeSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const appColors = getThemeColors(settings.activeThemeId, settings.themeColors);
  const appTokens = deriveThemeTokens(appColors);
  root.dataset.themeId = settings.activeThemeId;
  for (const [name, value] of Object.entries(appTokens)) {
    root.style.setProperty(name, value);
  }

  const terminal = getTerminalTheme(settings.activeTerminalThemeId);
  root.dataset.terminalThemeId = terminal.id;
  root.style.setProperty(
    "--terminal-background",
    settings.terminalBackgroundColor ?? terminal.theme.background,
  );
  root.style.setProperty("--terminal-foreground", terminal.theme.foreground);

  root.style.setProperty(
    "--terminal-bg-image",
    settings.terminalBackgroundImage
      ? `url("${settings.terminalBackgroundImage}")`
      : "none",
  );
  root.style.setProperty(
    "--terminal-bg-opacity",
    String(settings.terminalBackgroundOpacity / 100),
  );

  const dark = !isLight(appColors.background);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function loadThemeSettingsSnapshot(): ThemeSettings {
  if (typeof window === "undefined") return DEFAULT_THEME_SETTINGS;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_SETTINGS;
    return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export function saveThemeSettingsSnapshot(settings: ThemeSettings) {
  if (typeof window === "undefined") return;
  try {
    // Strip the background image — its base64 payload can be megabytes and
    // localStorage has a ~5MB cap. The image is restored from the Tauri store
    // after React hydrates; bootstrap only needs the small fields.
    const lean = { ...settings, terminalBackgroundImage: null };
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(lean));
  } catch {
    // Ignore localStorage failures and let the plugin store remain authoritative.
  }
}
