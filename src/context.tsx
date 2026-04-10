import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { Dispatch, ReactNode } from "react";
import { AppState, Action, Project } from "./types";
import {
  DEFAULT_EDITORS,
  DEFAULT_TOOLS,
  loadPersistedState,
  savePersistedState,
  type PersistedState,
} from "./store";
import {
  applyThemeToDocument,
  loadThemeSettingsSnapshot,
  resolveThemeMode,
  saveThemeSettingsSnapshot,
} from "./themes";

const initialThemeSettings = loadThemeSettingsSnapshot();

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
  tabs: [],
  activeTabId: null,
  tools: DEFAULT_TOOLS,
  editors: DEFAULT_EDITORS,
  uiFontSize: 14,
  terminalFontSize: 15,
  themeMode: initialThemeSettings.themeMode,
  themeTemplate: initialThemeSettings.themeTemplate,
  terminalTheme: initialThemeSettings.terminalTheme,
  view: "terminals",
};

const PERSIST_DEBOUNCE_MS = 120;

type Listener = () => void;

interface AppStore {
  dispatch: Dispatch<Action>;
  getLoaded: () => boolean;
  getState: () => AppState;
  hydrate: (state: PersistedState) => void;
  markLoaded: () => void;
  subscribe: (listener: Listener) => () => void;
  subscribeLoaded: (listener: Listener) => () => void;
}

function resolveActiveProjectId(
  projects: AppState["projects"],
  activeProjectId: string | null,
) {
  if (projects.length === 0) {
    return null;
  }

  return projects.some((project) => project.id === activeProjectId)
    ? activeProjectId
    : projects[0].id;
}

function resolveActiveTabId(
  tabs: AppState["tabs"],
  activeTabId: string | null,
  activeProjectId: string | null,
) {
  if (!activeProjectId) {
    return null;
  }

  const activeProjectTabs = tabs.filter((tab) => tab.projectId === activeProjectId);
  if (activeProjectTabs.length === 0) {
    return null;
  }

  const matchingTab = activeTabId
    ? activeProjectTabs.find((tab) => tab.id === activeTabId) ?? null
    : null;

  return matchingTab ? matchingTab.id : activeProjectTabs[activeProjectTabs.length - 1].id;
}

function normalizeState(state: AppState): AppState {
  const activeProjectId = resolveActiveProjectId(
    state.projects,
    state.activeProjectId,
  );
  const activeTabId = resolveActiveTabId(state.tabs, state.activeTabId, activeProjectId);

  if (
    activeProjectId === state.activeProjectId &&
    activeTabId === state.activeTabId
  ) {
    return state;
  }

  return {
    ...state,
    activeProjectId,
    activeTabId,
  };
}

function updateProject(
  state: AppState,
  id: string,
  updater: (project: Project) => Project,
): AppState {
  let changed = false;

  const projects = state.projects.map((project) => {
    if (project.id !== id) {
      return project;
    }

    const nextProject = updater(project);
    if (nextProject !== project) {
      changed = true;
    }

    return nextProject;
  });

  if (!changed) {
    return state;
  }

  return { ...state, projects };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROJECTS":
      return state.projects === action.projects
        ? state
        : normalizeState({ ...state, projects: action.projects });
    case "ADD_PROJECT":
      return normalizeState({
        ...state,
        projects: [...state.projects, action.project],
      });
    case "REMOVE_PROJECT": {
      if (!state.projects.some((project) => project.id === action.id)) {
        return state;
      }

      return normalizeState({
        ...state,
        activeProjectId:
          state.activeProjectId === action.id ? null : state.activeProjectId,
        projects: state.projects.filter((project) => project.id !== action.id),
        tabs: state.tabs.filter((tab) => tab.projectId !== action.id),
      });
    }
    case "RENAME_PROJECT":
      return updateProject(state, action.id, (project) =>
        project.name === action.name ? project : { ...project, name: action.name },
      );
    case "SET_PROJECT_COLOR":
      return updateProject(state, action.id, (project) =>
        project.color === action.color ? project : { ...project, color: action.color },
      );
    case "SET_PROJECT_COMMANDS":
      return updateProject(state, action.id, (project) =>
        project.commands === action.commands
          ? project
          : { ...project, commands: action.commands },
      );
    case "SET_ACTIVE_PROJECT":
      return state.activeProjectId === action.id
        ? state
        : { ...state, activeProjectId: action.id };
    case "SET_TABS":
      return state.tabs === action.tabs ? state : { ...state, tabs: action.tabs };
    case "ADD_TAB":
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    case "REMOVE_TAB": {
      const index = state.tabs.findIndex((tab) => tab.id === action.tabId);
      if (index === -1) {
        return state;
      }

      const nextTabs = state.tabs.filter((tab) => tab.id !== action.tabId);
      let nextActiveTabId = state.activeTabId;

      if (action.tabId === state.activeTabId) {
        const projectId = state.tabs[index]?.projectId;
        const siblings = nextTabs.filter((tab) => tab.projectId === projectId);
        nextActiveTabId =
          siblings.length > 0 ? siblings[siblings.length - 1].id : null;
      }

      return {
        ...state,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
      };
    }
    case "RENAME_TAB": {
      let changed = false;

      const tabs = state.tabs.map((tab) => {
        if (tab.id !== action.tabId) {
          return tab;
        }

        if (tab.label === action.label) {
          return tab;
        }

        changed = true;
        return { ...tab, label: action.label };
      });

      return changed ? { ...state, tabs } : state;
    }
    case "SET_ACTIVE_TAB":
      return state.activeTabId === action.tabId
        ? state
        : { ...state, activeTabId: action.tabId };
    case "SET_UI_FONT_SIZE":
      return state.uiFontSize === action.size
        ? state
        : { ...state, uiFontSize: action.size };
    case "SET_TERMINAL_FONT_SIZE":
      return state.terminalFontSize === action.size
        ? state
        : { ...state, terminalFontSize: action.size };
    case "SET_THEME_MODE":
      return state.themeMode === action.mode
        ? state
        : { ...state, themeMode: action.mode };
    case "SET_THEME_TEMPLATE":
      return state.themeTemplate === action.template
        ? state
        : { ...state, themeTemplate: action.template };
    case "SET_TERMINAL_THEME":
      return state.terminalTheme === action.theme
        ? state
        : { ...state, terminalTheme: action.theme };
    case "SET_TOOLS":
      return state.tools === action.tools
        ? state
        : { ...state, tools: action.tools };
    case "SET_EDITORS":
      return state.editors === action.editors
        ? state
        : { ...state, editors: action.editors };
    case "IMPORT_SETTINGS": {
      // Replace persisted settings while keeping ephemeral session state
      // (tabs, active*, view) intact. Tabs that reference removed projects
      // are dropped via normalizeState.
      const next: AppState = {
        ...state,
        projects: action.settings.projects,
        tools: action.settings.tools,
        editors: action.settings.editors,
        uiFontSize: action.settings.uiFontSize,
        terminalFontSize: action.settings.terminalFontSize,
        themeMode: action.settings.themeMode,
        themeTemplate: action.settings.themeTemplate,
        terminalTheme: action.settings.terminalTheme,
        tabs: state.tabs.filter((tab) =>
          action.settings.projects.some((project) => project.id === tab.projectId),
        ),
      };
      return normalizeState(next);
    }
    case "SET_VIEW":
      return state.view === action.view ? state : { ...state, view: action.view };
    default:
      return state;
  }
}

function toPersistedState(state: AppState): PersistedState {
  return {
    projects: state.projects,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    tools: state.tools,
    editors: state.editors,
    uiFontSize: state.uiFontSize,
    terminalFontSize: state.terminalFontSize,
    themeMode: state.themeMode,
    themeTemplate: state.themeTemplate,
    terminalTheme: state.terminalTheme,
  };
}

function createAppStore(): AppStore {
  let state = initialState;
  let loaded = false;
  const listeners = new Set<Listener>();
  const loadedListeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const notifyLoaded = () => {
    loadedListeners.forEach((listener) => listener());
  };

  const setLoaded = (nextLoaded: boolean) => {
    if (loaded === nextLoaded) {
      return;
    }

    loaded = nextLoaded;
    notifyLoaded();
  };

  return {
    dispatch(action) {
      const nextState = reducer(state, action);
      if (nextState === state) {
        return;
      }

      state = nextState;
      notify();
    },
    getLoaded() {
      return loaded;
    },
    getState() {
      return state;
    },
    hydrate(persistedState) {
      state = normalizeState({ ...state, ...persistedState });
      notify();
      setLoaded(true);
    },
    markLoaded() {
      setLoaded(true);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeLoaded(listener) {
      loadedListeners.add(listener);
      return () => loadedListeners.delete(listener);
    },
  };
}

const AppStoreContext = createContext<AppStore | null>(null);

function useStore() {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useStore must be used within AppProvider");
  }

  return store;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAppStore();
  }

  const store = storeRef.current;

  useEffect(() => {
    let cancelled = false;

    loadPersistedState()
      .then((persistedState) => {
        if (!cancelled) {
          store.hydrate(persistedState);
        }
      })
      .catch((error) => {
        console.error("Failed to load persisted state", error);
        if (!cancelled) {
          store.markLoaded();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    let lastThemeKey = "";
    let lastResolvedMode = "";

    const syncTheme = () => {
      const { themeMode, themeTemplate, terminalTheme } = store.getState();
      const themeSettings = { themeMode, themeTemplate, terminalTheme };
      const resolvedMode = resolveThemeMode(themeMode, mediaQuery.matches);
      const themeKey = `${themeTemplate}:${themeMode}:${terminalTheme}`;

      if (themeKey === lastThemeKey && resolvedMode === lastResolvedMode) {
        return;
      }

      lastThemeKey = themeKey;
      lastResolvedMode = resolvedMode;

      applyThemeToDocument(themeSettings, mediaQuery.matches);
      saveThemeSettingsSnapshot(themeSettings);
    };

    syncTheme();

    const unsubscribe = store.subscribe(syncTheme);
    const handleChange = () => {
      if (store.getState().themeMode === "system") {
        syncTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      unsubscribe();

      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [store]);

  useEffect(() => {
    let pendingTimeout: number | null = null;
    let pendingState: PersistedState | null = null;
    let saveChain = Promise.resolve();

    const enqueueSave = () => {
      if (!pendingState) {
        return;
      }

      const stateToSave = pendingState;
      pendingState = null;

      saveChain = saveChain
        .then(() => savePersistedState(stateToSave))
        .catch((error) => {
          console.error("Failed to save persisted state", error);
        });
    };

    const unsubscribe = store.subscribe(() => {
      if (!store.getLoaded()) {
        return;
      }

      pendingState = toPersistedState(store.getState());

      if (pendingTimeout !== null) {
        window.clearTimeout(pendingTimeout);
      }

      pendingTimeout = window.setTimeout(() => {
        pendingTimeout = null;
        enqueueSave();
      }, PERSIST_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();

      if (pendingTimeout !== null) {
        window.clearTimeout(pendingTimeout);
      }

      enqueueSave();
    };
  }, [store]);

  return (
    <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>
  );
}

export function useAppDispatch() {
  return useStore().dispatch;
}

export function useAppLoaded() {
  const store = useStore();

  return useSyncExternalStore(
    store.subscribeLoaded,
    store.getLoaded,
    store.getLoaded,
  );
}

export function useAppSelector<T>(selector: (state: AppState) => T) {
  const store = useStore();

  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
