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
  getThemeColors,
  loadThemeSettingsSnapshot,
  saveThemeSettingsSnapshot,
} from "./themes";
import { DEFAULT_TERMINAL_FONT_FAMILY_ID } from "./terminalFonts";

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
  terminalFontFamily: DEFAULT_TERMINAL_FONT_FAMILY_ID,
  activeThemeId: initialThemeSettings.activeThemeId,
  themeColors: initialThemeSettings.themeColors,
  activeTerminalThemeId: initialThemeSettings.activeTerminalThemeId,
  terminalBackgroundColor: initialThemeSettings.terminalBackgroundColor,
  terminalBackgroundImage: initialThemeSettings.terminalBackgroundImage,
  terminalBackgroundOpacity: initialThemeSettings.terminalBackgroundOpacity,
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
  projects: AppState["projects"],
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

  const activeProject = projects.find((project) => project.id === activeProjectId);
  const lastProjectTabId = activeProject?.lastActiveTabId ?? null;
  const matchingProjectTab = lastProjectTabId
    ? activeProjectTabs.find((tab) => tab.id === lastProjectTabId) ?? null
    : null;

  if (matchingProjectTab) {
    return matchingProjectTab.id;
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
  const activeTabId = resolveActiveTabId(
    state.projects,
    state.tabs,
    state.activeTabId,
    activeProjectId,
  );

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
        : normalizeState({ ...state, activeProjectId: action.id });
    case "SET_TABS":
      return state.tabs === action.tabs ? state : { ...state, tabs: action.tabs };
    case "ADD_TAB":
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
        projects: state.projects.map((project) =>
          project.id === action.tab.projectId
            ? { ...project, lastActiveTabId: action.tab.id }
            : project,
        ),
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
        projects: state.projects.map((project) => {
          if (project.lastActiveTabId !== action.tabId) {
            return project;
          }

          const siblings = nextTabs.filter((tab) => tab.projectId === project.id);
          return {
            ...project,
            lastActiveTabId:
              siblings.length > 0 ? siblings[siblings.length - 1].id : null,
          };
        }),
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
      if (state.activeTabId === action.tabId) {
        return state;
      }

      return {
        ...state,
        activeTabId: action.tabId,
        projects: state.projects.map((project) => {
          const tabProjectId = action.tabId
            ? state.tabs.find((tab) => tab.id === action.tabId)?.projectId ?? null
            : null;

          return tabProjectId === project.id
            ? { ...project, lastActiveTabId: action.tabId }
            : project;
        }),
      };
    case "SET_UI_FONT_SIZE":
      return state.uiFontSize === action.size
        ? state
        : { ...state, uiFontSize: action.size };
    case "SET_TERMINAL_FONT_SIZE":
      return state.terminalFontSize === action.size
        ? state
        : { ...state, terminalFontSize: action.size };
    case "SET_TERMINAL_FONT_FAMILY":
      return state.terminalFontFamily === action.fontFamily
        ? state
        : { ...state, terminalFontFamily: action.fontFamily };
    case "SET_ACTIVE_THEME":
      return state.activeThemeId === action.themeId
        ? state
        : { ...state, activeThemeId: action.themeId };
    case "SET_THEME_COLOR": {
      const current = getThemeColors(action.themeId, state.themeColors);
      const next = { ...current, [action.key]: action.value };
      return {
        ...state,
        themeColors: { ...state.themeColors, [action.themeId]: next },
      };
    }
    case "SET_ACTIVE_TERMINAL_THEME":
      // Picking a theme clears the user's bg color override so the new
      // theme's default takes effect.
      return state.activeTerminalThemeId === action.themeId &&
        state.terminalBackgroundColor === null
        ? state
        : {
            ...state,
            activeTerminalThemeId: action.themeId,
            terminalBackgroundColor: null,
          };
    case "SET_TERMINAL_BACKGROUND_COLOR":
      return state.terminalBackgroundColor === action.color
        ? state
        : { ...state, terminalBackgroundColor: action.color };
    case "SET_TERMINAL_BACKGROUND_IMAGE":
      return state.terminalBackgroundImage === action.image
        ? state
        : { ...state, terminalBackgroundImage: action.image };
    case "SET_TERMINAL_BACKGROUND_OPACITY": {
      const opacity = Math.min(100, Math.max(0, Math.round(action.opacity)));
      return state.terminalBackgroundOpacity === opacity
        ? state
        : { ...state, terminalBackgroundOpacity: opacity };
    }
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
        terminalFontFamily: action.settings.terminalFontFamily,
        activeThemeId: action.settings.activeThemeId,
        themeColors: action.settings.themeColors,
        activeTerminalThemeId: action.settings.activeTerminalThemeId,
        terminalBackgroundColor: action.settings.terminalBackgroundColor,
        terminalBackgroundImage: action.settings.terminalBackgroundImage,
        terminalBackgroundOpacity: action.settings.terminalBackgroundOpacity,
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
    terminalFontFamily: state.terminalFontFamily,
    activeThemeId: state.activeThemeId,
    themeColors: state.themeColors,
    activeTerminalThemeId: state.activeTerminalThemeId,
    terminalBackgroundColor: state.terminalBackgroundColor,
    terminalBackgroundImage: state.terminalBackgroundImage,
    terminalBackgroundOpacity: state.terminalBackgroundOpacity,
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
    let lastSnapshot = "";

    const syncTheme = () => {
      const {
        activeThemeId,
        themeColors,
        activeTerminalThemeId,
        terminalBackgroundColor,
        terminalBackgroundImage,
        terminalBackgroundOpacity,
      } = store.getState();
      const themeSettings = {
        activeThemeId,
        themeColors,
        activeTerminalThemeId,
        terminalBackgroundColor,
        terminalBackgroundImage,
        terminalBackgroundOpacity,
      };
      const snapshot = JSON.stringify(themeSettings);

      if (snapshot === lastSnapshot) return;

      lastSnapshot = snapshot;
      applyThemeToDocument(themeSettings);
      saveThemeSettingsSnapshot(themeSettings);
    };

    syncTheme();
    return store.subscribe(syncTheme);
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
