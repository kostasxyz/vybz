export interface Project {
  id: string;
  path: string;
  name: string;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
}

export type Action =
  | { type: "SET_PROJECTS"; projects: Project[] }
  | { type: "ADD_PROJECT"; project: Project }
  | { type: "REMOVE_PROJECT"; id: string }
  | { type: "SET_ACTIVE_PROJECT"; id: string | null };
