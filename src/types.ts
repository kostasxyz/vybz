export const PROJECT_COLORS = [
  "#e06c75", "#e5c07b", "#98c379", "#56b6c2",
  "#61afef", "#c678dd", "#d19a66", "#be5046",
  "#7ec8e3", "#c3e88d", "#f78c6c", "#bb80b3",
] as const;

export interface ProjectCommand {
  id: string;
  name: string;
  command: string;
}

export interface Project {
  id: string;
  path: string;
  name: string;
  color: string;
  commands?: ProjectCommand[];
}

export type ToolType = "Shell" | "Claude" | "Codex" | "OpenCode" | "Pi";

export interface Tab {
  id: string;
  projectId: string;
  label: string;
  command?: string;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  tabs: Tab[];
  activeTabId: string | null;
  uiFontSize: number;
  terminalFontSize: number;
  view: "terminals" | "settings" | "project-settings";
}

export type Action =
  | { type: "SET_PROJECTS"; projects: Project[] }
  | { type: "ADD_PROJECT"; project: Project }
  | { type: "REMOVE_PROJECT"; id: string }
  | { type: "RENAME_PROJECT"; id: string; name: string }
  | { type: "SET_PROJECT_COLOR"; id: string; color: string }
  | { type: "SET_PROJECT_COMMANDS"; id: string; commands: ProjectCommand[] }
  | { type: "SET_ACTIVE_PROJECT"; id: string | null }
  | { type: "SET_TABS"; tabs: Tab[] }
  | { type: "ADD_TAB"; tab: Tab }
  | { type: "REMOVE_TAB"; tabId: string }
  | { type: "RENAME_TAB"; tabId: string; label: string }
  | { type: "SET_ACTIVE_TAB"; tabId: string | null }
  | { type: "SET_UI_FONT_SIZE"; size: number }
  | { type: "SET_TERMINAL_FONT_SIZE"; size: number }
  | { type: "SET_VIEW"; view: "terminals" | "settings" | "project-settings" };
