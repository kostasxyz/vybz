import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  ReactNode,
  Dispatch,
} from "react";
import { AppState, Action } from "./types";
import {
  loadProjects,
  saveProjects,
  loadUiFontSize,
  saveUiFontSize,
  loadTerminalFontSize,
  saveTerminalFontSize,
  loadTabs,
  saveTabs,
  loadActiveTabId,
  saveActiveTabId,
} from "./store";

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
  tabs: [],
  activeTabId: null,
  uiFontSize: 14,
  terminalFontSize: 15,
  view: "terminals",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROJECTS":
      return { ...state, projects: action.projects };
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.project] };
    case "REMOVE_PROJECT": {
      const remaining = state.tabs.filter((t) => t.projectId !== action.id);
      const activeTabGone =
        state.activeTabId && !remaining.some((t) => t.id === state.activeTabId);
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        activeProjectId:
          state.activeProjectId === action.id ? null : state.activeProjectId,
        tabs: remaining,
        activeTabId: activeTabGone ? null : state.activeTabId,
      };
    }
    case "RENAME_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p,
        ),
      };
    case "SET_PROJECT_COLOR":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, color: action.color } : p,
        ),
      };
    case "SET_PROJECT_COMMANDS":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, commands: action.commands } : p,
        ),
      };
    case "SET_ACTIVE_PROJECT":
      return { ...state, activeProjectId: action.id };
    case "SET_TABS":
      return { ...state, tabs: action.tabs };
    case "ADD_TAB":
      return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
    case "REMOVE_TAB": {
      const idx = state.tabs.findIndex((t) => t.id === action.tabId);
      const next = state.tabs.filter((t) => t.id !== action.tabId);
      let newActiveTabId = state.activeTabId;
      if (action.tabId === state.activeTabId) {
        const projectId = state.tabs[idx]?.projectId;
        const siblings = next.filter((t) => t.projectId === projectId);
        newActiveTabId = siblings.length > 0 ? siblings[siblings.length - 1].id : null;
      }
      return { ...state, tabs: next, activeTabId: newActiveTabId };
    }
    case "RENAME_TAB":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, label: action.label } : t,
        ),
      };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTabId: action.tabId };
    case "SET_UI_FONT_SIZE":
      return { ...state, uiFontSize: action.size };
    case "SET_TERMINAL_FONT_SIZE":
      return { ...state, terminalFontSize: action.size };
    case "SET_VIEW":
      return { ...state, view: action.view };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
  loaded: boolean;
}>({ state: initialState, dispatch: () => {}, loaded: false });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      loadProjects(),
      loadUiFontSize(),
      loadTerminalFontSize(),
      loadTabs(),
      loadActiveTabId(),
    ]).then(([projects, uiFontSize, terminalFontSize, tabs, activeTabId]) => {
      dispatch({ type: "SET_PROJECTS", projects });
      dispatch({ type: "SET_UI_FONT_SIZE", size: uiFontSize });
      dispatch({ type: "SET_TERMINAL_FONT_SIZE", size: terminalFontSize });
      dispatch({ type: "SET_TABS", tabs });
      dispatch({ type: "SET_ACTIVE_TAB", tabId: activeTabId });
      loaded.current = true;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded.current) saveProjects(state.projects);
  }, [state.projects]);

  useEffect(() => {
    if (loaded.current) saveUiFontSize(state.uiFontSize);
  }, [state.uiFontSize]);

  useEffect(() => {
    if (loaded.current) saveTerminalFontSize(state.terminalFontSize);
  }, [state.terminalFontSize]);

  useEffect(() => {
    if (loaded.current) saveTabs(state.tabs);
  }, [state.tabs]);

  useEffect(() => {
    if (loaded.current) saveActiveTabId(state.activeTabId);
  }, [state.activeTabId]);

  return (
    <AppContext.Provider value={{ state, dispatch, loaded: ready }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
