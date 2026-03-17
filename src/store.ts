import { load } from "@tauri-apps/plugin-store";
import { AppState } from "./types";
import { DEFAULT_THEME_SETTINGS } from "./themes";

const STORE_FILE = "projects.json";

type PersistedState = Pick<
  AppState,
  | "projects"
  | "tabs"
  | "activeTabId"
  | "uiFontSize"
  | "terminalFontSize"
  | "themeMode"
  | "themeTemplate"
>;

const DEFAULT_PERSISTED_STATE: PersistedState = {
  projects: [],
  tabs: [],
  activeTabId: null,
  uiFontSize: 14,
  terminalFontSize: 15,
  themeMode: DEFAULT_THEME_SETTINGS.themeMode,
  themeTemplate: DEFAULT_THEME_SETTINGS.themeTemplate,
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
    uiFontSize,
    terminalFontSize,
    themeMode,
    themeTemplate,
  ] =
    await Promise.all([
      store.get<PersistedState["projects"]>("projects"),
      store.get<PersistedState["tabs"]>("tabs"),
      store.get<PersistedState["activeTabId"]>("activeTabId"),
      store.get<PersistedState["uiFontSize"]>("uiFontSize"),
      store.get<PersistedState["terminalFontSize"]>("terminalFontSize"),
      store.get<PersistedState["themeMode"]>("themeMode"),
      store.get<PersistedState["themeTemplate"]>("themeTemplate"),
    ]);

  return {
    projects: projects ?? DEFAULT_PERSISTED_STATE.projects,
    tabs: tabs ?? DEFAULT_PERSISTED_STATE.tabs,
    activeTabId: activeTabId ?? DEFAULT_PERSISTED_STATE.activeTabId,
    uiFontSize: uiFontSize ?? DEFAULT_PERSISTED_STATE.uiFontSize,
    terminalFontSize:
      terminalFontSize ?? DEFAULT_PERSISTED_STATE.terminalFontSize,
    themeMode: themeMode ?? DEFAULT_PERSISTED_STATE.themeMode,
    themeTemplate: themeTemplate ?? DEFAULT_PERSISTED_STATE.themeTemplate,
  };
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const store = await getStore();

  await Promise.all([
    store.set("projects", state.projects),
    store.set("tabs", state.tabs),
    store.set("activeTabId", state.activeTabId),
    store.set("uiFontSize", state.uiFontSize),
    store.set("terminalFontSize", state.terminalFontSize),
    store.set("themeMode", state.themeMode),
    store.set("themeTemplate", state.themeTemplate),
  ]);

  await store.save();
}

export type { PersistedState };
