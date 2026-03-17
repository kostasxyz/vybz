import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  ReactNode,
  Dispatch,
} from "react";
import { AppState, Action } from "./types";
import { loadProjects, saveProjects } from "./store";

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROJECTS":
      return { ...state, projects: action.projects };
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.project] };
    case "REMOVE_PROJECT": {
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        activeProjectId:
          state.activeProjectId === action.id ? null : state.activeProjectId,
      };
    }
    case "SET_ACTIVE_PROJECT":
      return { ...state, activeProjectId: action.id };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);

  useEffect(() => {
    loadProjects().then((projects) => {
      dispatch({ type: "SET_PROJECTS", projects });
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (loaded.current) {
      saveProjects(state.projects);
    }
  }, [state.projects]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
