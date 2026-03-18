export type ThemeTemplateId =
  | "native"
  | "amber"
  | "t3chat"
  | "solar-dusk"
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

export interface ThemeSettings {
  themeMode: ThemeMode;
  themeTemplate: ThemeTemplateId;
}

export const THEME_STORAGE_KEY = "vybz.theme";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  themeMode: "dark",
  themeTemplate: "native",
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
