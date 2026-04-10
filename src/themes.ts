export type ThemeTemplateId =
  | "native"
  | "amber"
  | "t3chat"
  | "solar-dusk"
  | "synthwave"
  | "purple";

export type TerminalThemeId =
  | "ayu"
  | "night-owl"
  | "solarized-dark"
  | "solarized-light"
  | "github-light"
  | "amber-light"
  | "tokyo-night"
  | "synthwave";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

export interface ThemeTemplateDefinition {
  id: ThemeTemplateId;
  name: string;
  description: string;
  preview: {
    light: string;
    dark: string;
    accent: string;
  };
}

export interface TerminalThemeDefinition {
  id: TerminalThemeId;
  name: string;
  description: string;
  preview: {
    background: string;
    foreground: string;
    accent: string;
  };
}

export interface ThemeSettings {
  themeMode: ThemeMode;
  themeTemplate: ThemeTemplateId;
  terminalTheme: TerminalThemeId;
}

export const THEME_STORAGE_KEY = "vybz.theme";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  themeMode: "dark",
  themeTemplate: "native",
  terminalTheme: "night-owl",
};

export const THEME_TEMPLATES: ThemeTemplateDefinition[] = [
  {
    id: "native",
    name: "Native",
    description: "Keeps the current Vybz chrome with a matching light counterpart.",
    preview: {
      light: "#f3f5f7",
      dark: "#252526",
      accent: "#007acc",
    },
  },
  {
    id: "amber",
    name: "Amber",
    description: "Warm amber accents with softer neutrals in both light and dark.",
    preview: {
      light: "oklch(0.9670 0.0029 264.5419)",
      dark: "oklch(0.1822 0 0)",
      accent: "oklch(0.7214 0.1337 49.9802)",
    },
  },
  {
    id: "t3chat",
    name: "T3Chat",
    description: "Rosy chat-inspired tones with a deeper plum dark mode.",
    preview: {
      light: "oklch(0.9360 0.0288 320.5788)",
      dark: "oklch(0.1893 0.0163 331.0475)",
      accent: "oklch(0.5316 0.1409 355.1999)",
    },
  },
  {
    id: "solar-dusk",
    name: "Solar Dusk",
    description: "Warm sand tones in light mode with ember and dusk accents at night.",
    preview: {
      light: "oklch(0.9363 0.0218 83.2637)",
      dark: "oklch(0.2685 0.0063 34.2976)",
      accent: "oklch(0.7049 0.1867 47.6044)",
    },
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Neon pinks and cyan accents over pastel days and violet nights.",
    preview: {
      light: "#f7e9ff",
      dark: "#140d22",
      accent: "#ff4fd8",
    },
  },
  {
    id: "purple",
    name: "Purple",
    description: "Regal amethyst and indigo tones with cool violet accents.",
    preview: {
      light: "#f5f0ff",
      dark: "#110b20",
      accent: "#7c3aed",
    },
  },
];

export const TERMINAL_THEMES: TerminalThemeDefinition[] = [
  {
    id: "ayu",
    name: "Ayu",
    description: "Warm dark theme with golden accents inspired by the Ayu color scheme.",
    preview: {
      background: "#0b0e14",
      foreground: "#bfbdb6",
      accent: "#e6b450",
    },
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "A dark theme optimized for nighttime coding with high contrast.",
    preview: {
      background: "#011627",
      foreground: "#d6deeb",
      accent: "#82aaff",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    description: "Precision color scheme with dark background for reduced eye strain.",
    preview: {
      background: "#002b36",
      foreground: "#839496",
      accent: "#268bd2",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "Precision color scheme with light background for daytime use.",
    preview: {
      background: "#fdf6e3",
      foreground: "#657b83",
      accent: "#268bd2",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    description: "Clean light palette with cool blue accents to pair with the Native template.",
    preview: {
      background: "#ffffff",
      foreground: "#24292e",
      accent: "#0366d6",
    },
  },
  {
    id: "amber-light",
    name: "Amber Light",
    description: "Warm ivory background with amber highlights to pair with the Amber template.",
    preview: {
      background: "#fbf7f0",
      foreground: "#3e2e1c",
      accent: "#b45309",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "A dark theme inspired by Tokyo neon lights at night.",
    preview: {
      background: "#1a1b26",
      foreground: "#a9b1d6",
      accent: "#7aa2f7",
    },
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "Neon pinks and cyan accents on a deep purple background.",
    preview: {
      background: "#140d22",
      foreground: "#f4f4f4",
      accent: "#ff4fd8",
    },
  },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isThemeTemplateId(value: unknown): value is ThemeTemplateId {
  return (
    value === "native" ||
    value === "amber" ||
    value === "t3chat" ||
    value === "solar-dusk" ||
    value === "synthwave" ||
    value === "purple"
  );
}

export function isTerminalThemeId(value: unknown): value is TerminalThemeId {
  return (
    value === "ayu" ||
    value === "night-owl" ||
    value === "solarized-dark" ||
    value === "solarized-light" ||
    value === "github-light" ||
    value === "amber-light" ||
    value === "tokyo-night" ||
    value === "synthwave"
  );
}

export function normalizeThemeSettings(
  value: Partial<ThemeSettings> | null | undefined,
): ThemeSettings {
  return {
    themeMode: isThemeMode(value?.themeMode)
      ? value.themeMode
      : DEFAULT_THEME_SETTINGS.themeMode,
    themeTemplate: isThemeTemplateId(value?.themeTemplate)
      ? value.themeTemplate
      : DEFAULT_THEME_SETTINGS.themeTemplate,
    terminalTheme: isTerminalThemeId(value?.terminalTheme)
      ? value.terminalTheme
      : DEFAULT_THEME_SETTINGS.terminalTheme,
  };
}

function getSystemDarkPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DEFAULT_THEME_SETTINGS.themeMode === "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark = getSystemDarkPreference(),
): ResolvedThemeMode {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return mode;
}

export function applyThemeToDocument(
  settings: ThemeSettings,
  prefersDark = getSystemDarkPreference(),
) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedMode = resolveThemeMode(settings.themeMode, prefersDark);
  const root = document.documentElement;

  root.dataset.themeTemplate = settings.themeTemplate;
  root.dataset.terminalTheme = settings.terminalTheme;
  root.dataset.themeMode = resolvedMode;
  root.classList.toggle("dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;
}

export function loadThemeSettingsSnapshot(): ThemeSettings {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_THEME_SETTINGS;
    }

    return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export function saveThemeSettingsSnapshot(settings: ThemeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage failures and let the plugin store remain authoritative.
  }
}
