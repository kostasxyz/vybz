import { load } from "@tauri-apps/plugin-store";
import { AppState, EditorConfig, ToolConfig } from "./types";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings } from "./themes";

export const DEFAULT_TOOLS: ToolConfig[] = [
  { id: "shell", name: "Shell", builtin: true, enabled: true },
  { id: "claude", name: "Claude", cmd: "claude", builtin: true, enabled: true },
  { id: "codex", name: "Codex", cmd: "codex", builtin: true, enabled: true },
  { id: "opencode", name: "OpenCode", cmd: "opencode", builtin: true, enabled: true },
  {
    id: "pi",
    name: "Pi",
    cmd: "pi",
    builtin: true,
    enabled: true,
    shiftEnterMode: "modifyOtherKeys",
  },
];

export const DEFAULT_EDITORS: EditorConfig[] = [
  { id: "zed", name: "Zed", cmd: "zed", builtin: true, enabled: true },
  { id: "code", name: "VS Code", cmd: "code", builtin: true, enabled: true },
  { id: "cursor", name: "Cursor", cmd: "cursor", builtin: true, enabled: true },
  { id: "antigravity", name: "Antigravity", cmd: "antigravity", builtin: true, enabled: true },
];

function mergeWithDefaults<T extends { id: string; builtin?: boolean }>(
  stored: T[] | null | undefined,
  defaults: T[],
): T[] {
  if (!stored || stored.length === 0) return defaults;
  const defaultsById = new Map(defaults.map((d) => [d.id, d]));
  const patched = stored.map((item) => {
    const def = defaultsById.get(item.id);
    return def ? { ...def, ...item, builtin: true } : item;
  });
  const storedIds = new Set(stored.map((item) => item.id));
  const missing = defaults.filter((d) => !storedIds.has(d.id));
  return [...missing, ...patched];
}

const STORE_FILE = "projects.json";

type PersistedState = Pick<
  AppState,
  | "projects"
  | "tabs"
  | "activeTabId"
  | "tools"
  | "editors"
  | "uiFontSize"
  | "terminalFontSize"
  | "activeThemeId"
  | "themeColors"
  | "activeTerminalThemeId"
  | "terminalBackgroundColor"
  | "terminalBackgroundImage"
  | "terminalBackgroundOpacity"
>;

const DEFAULT_PERSISTED_STATE: PersistedState = {
  projects: [],
  tabs: [],
  activeTabId: null,
  tools: DEFAULT_TOOLS,
  editors: DEFAULT_EDITORS,
  uiFontSize: 14,
  terminalFontSize: 15,
  activeThemeId: DEFAULT_THEME_SETTINGS.activeThemeId,
  themeColors: DEFAULT_THEME_SETTINGS.themeColors,
  activeTerminalThemeId: DEFAULT_THEME_SETTINGS.activeTerminalThemeId,
  terminalBackgroundColor: DEFAULT_THEME_SETTINGS.terminalBackgroundColor,
  terminalBackgroundImage: DEFAULT_THEME_SETTINGS.terminalBackgroundImage,
  terminalBackgroundOpacity: DEFAULT_THEME_SETTINGS.terminalBackgroundOpacity,
};

let storePromise: ReturnType<typeof load> | null = null;

async function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE);
  }

  return storePromise;
}

export async function loadPersistedState(): Promise<PersistedState> {
  const store = await getStore();
  const [
    projects,
    tabs,
    activeTabId,
    tools,
    editors,
    uiFontSize,
    terminalFontSize,
    activeThemeId,
    themeColors,
    activeTerminalThemeId,
    terminalBackgroundColor,
    terminalBackgroundImage,
    terminalBackgroundOpacity,
  ] = await Promise.all([
    store.get<PersistedState["projects"]>("projects"),
    store.get<PersistedState["tabs"]>("tabs"),
    store.get<PersistedState["activeTabId"]>("activeTabId"),
    store.get<PersistedState["tools"]>("tools"),
    store.get<PersistedState["editors"]>("editors"),
    store.get<PersistedState["uiFontSize"]>("uiFontSize"),
    store.get<PersistedState["terminalFontSize"]>("terminalFontSize"),
    store.get<PersistedState["activeThemeId"]>("activeThemeId"),
    store.get<PersistedState["themeColors"]>("themeColors"),
    store.get<PersistedState["activeTerminalThemeId"]>("activeTerminalThemeId"),
    store.get<PersistedState["terminalBackgroundColor"]>("terminalBackgroundColor"),
    store.get<PersistedState["terminalBackgroundImage"]>("terminalBackgroundImage"),
    store.get<PersistedState["terminalBackgroundOpacity"]>("terminalBackgroundOpacity"),
  ]);

  const normalizedThemeSettings = normalizeThemeSettings({
    activeThemeId,
    themeColors,
    activeTerminalThemeId,
    terminalBackgroundColor,
    terminalBackgroundImage,
    terminalBackgroundOpacity,
  });

  return {
    projects: projects ?? DEFAULT_PERSISTED_STATE.projects,
    tabs: tabs ?? DEFAULT_PERSISTED_STATE.tabs,
    activeTabId: activeTabId ?? DEFAULT_PERSISTED_STATE.activeTabId,
    tools: mergeWithDefaults(tools, DEFAULT_TOOLS),
    editors: mergeWithDefaults(editors, DEFAULT_EDITORS),
    uiFontSize: uiFontSize ?? DEFAULT_PERSISTED_STATE.uiFontSize,
    terminalFontSize:
      terminalFontSize ?? DEFAULT_PERSISTED_STATE.terminalFontSize,
    activeThemeId: normalizedThemeSettings.activeThemeId,
    themeColors: normalizedThemeSettings.themeColors,
    activeTerminalThemeId: normalizedThemeSettings.activeTerminalThemeId,
    terminalBackgroundColor: normalizedThemeSettings.terminalBackgroundColor,
    terminalBackgroundImage: normalizedThemeSettings.terminalBackgroundImage,
    terminalBackgroundOpacity: normalizedThemeSettings.terminalBackgroundOpacity,
  };
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set("projects", state.projects),
    store.set("tabs", state.tabs),
    store.set("activeTabId", state.activeTabId),
    store.set("tools", state.tools),
    store.set("editors", state.editors),
    store.set("uiFontSize", state.uiFontSize),
    store.set("terminalFontSize", state.terminalFontSize),
    store.set("activeThemeId", state.activeThemeId),
    store.set("themeColors", state.themeColors),
    store.set("activeTerminalThemeId", state.activeTerminalThemeId),
    store.set("terminalBackgroundColor", state.terminalBackgroundColor),
    store.set("terminalBackgroundImage", state.terminalBackgroundImage),
    store.set("terminalBackgroundOpacity", state.terminalBackgroundOpacity),
  ]);

  await store.save();
}

export type { PersistedState };
