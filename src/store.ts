import { load } from "@tauri-apps/plugin-store";
import { AppState, EditorConfig } from "./types";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings } from "./themes";

export const DEFAULT_EDITORS: EditorConfig[] = [
  { id: "zed", name: "Zed", cmd: "zed", builtin: true, enabled: true },
  { id: "code", name: "VS Code", cmd: "code", builtin: true, enabled: true },
  { id: "cursor", name: "Cursor", cmd: "cursor", builtin: true, enabled: true },
  { id: "antigravity", name: "Antigravity", cmd: "antigravity", builtin: true, enabled: true },
];

const STORE_FILE = "projects.json";

type PersistedState = Pick<
  AppState,
  | "projects"
  | "tabs"
  | "activeTabId"
  | "editors"
  | "uiFontSize"
  | "terminalFontSize"
  | "themeMode"
  | "themeTemplate"
  | "terminalTheme"
>;

const DEFAULT_PERSISTED_STATE: PersistedState = {
  projects: [],
  tabs: [],
  activeTabId: null,
  editors: DEFAULT_EDITORS,
  uiFontSize: 14,
  terminalFontSize: 15,
  themeMode: DEFAULT_THEME_SETTINGS.themeMode,
  themeTemplate: DEFAULT_THEME_SETTINGS.themeTemplate,
  terminalTheme: DEFAULT_THEME_SETTINGS.terminalTheme,
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
    editors,
    uiFontSize,
    terminalFontSize,
    themeMode,
    themeTemplate,
    terminalTheme,
  ] =
    await Promise.all([
      store.get<PersistedState["projects"]>("projects"),
      store.get<PersistedState["tabs"]>("tabs"),
      store.get<PersistedState["activeTabId"]>("activeTabId"),
      store.get<PersistedState["editors"]>("editors"),
      store.get<PersistedState["uiFontSize"]>("uiFontSize"),
      store.get<PersistedState["terminalFontSize"]>("terminalFontSize"),
      store.get<PersistedState["themeMode"]>("themeMode"),
      store.get<PersistedState["themeTemplate"]>("themeTemplate"),
      store.get<PersistedState["terminalTheme"]>("terminalTheme"),
    ]);

  const normalizedThemeSettings = normalizeThemeSettings({
    themeMode,
    themeTemplate,
    terminalTheme,
  });

  return {
    projects: projects ?? DEFAULT_PERSISTED_STATE.projects,
    tabs: tabs ?? DEFAULT_PERSISTED_STATE.tabs,
    activeTabId: activeTabId ?? DEFAULT_PERSISTED_STATE.activeTabId,
    editors: editors ?? DEFAULT_PERSISTED_STATE.editors,
    uiFontSize: uiFontSize ?? DEFAULT_PERSISTED_STATE.uiFontSize,
    terminalFontSize:
      terminalFontSize ?? DEFAULT_PERSISTED_STATE.terminalFontSize,
    themeMode: normalizedThemeSettings.themeMode,
    themeTemplate: normalizedThemeSettings.themeTemplate,
    terminalTheme: normalizedThemeSettings.terminalTheme,
  };
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set("projects", state.projects),
    store.set("tabs", state.tabs),
    store.set("activeTabId", state.activeTabId),
    store.set("editors", state.editors),
    store.set("uiFontSize", state.uiFontSize),
    store.set("terminalFontSize", state.terminalFontSize),
    store.set("themeMode", state.themeMode),
    store.set("themeTemplate", state.themeTemplate),
    store.set("terminalTheme", state.terminalTheme),
  ]);

  await store.save();
}

export type { PersistedState };
