import type { ThemeMode, ThemeTemplateId, TerminalThemeId } from "./themes";

export const PROJECT_COLORS = [
  "#e06c75", "#e5c07b", "#98c379", "#56b6c2",
  "#61afef", "#c678dd", "#d19a66", "#be5046",
  "#7ec8e3", "#c3e88d", "#f78c6c", "#bb80b3",
] as const;

/**
 * How a tool interprets Shift+Enter bytes coming from the terminal.
 *
 * - `legacyAltEnter` (default): send `\x1b\r` (ESC + CR). TUIs that treat
 *   Alt+Enter as "insert newline" (Claude Code, Codex, OpenCode, …) accept
 *   this.
 * - `modifyOtherKeys`: send `\x1b[27;2;13~` (xterm modifyOtherKeys encoding
 *   of Shift+Enter). Required by tools that distinguish Shift+Enter from
 *   Alt+Enter, e.g. Pi — its Alt+Enter is bound to "Queue follow-up".
 */
export type ShiftEnterMode = "legacyAltEnter" | "modifyOtherKeys";

export interface ToolConfig {
  id: string;
  name: string;
  cmd?: string;
  builtin?: boolean;
  enabled?: boolean;
  iconUrl?: string;
  shiftEnterMode?: ShiftEnterMode;
}

export interface EditorConfig {
  id: string;
  name: string;
  cmd: string;
  builtin?: boolean;
  enabled?: boolean;
  iconUrl?: string;
}

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

export interface Tab {
  id: string;
  projectId: string;
  label: string;
  command?: string;
  /**
   * When true, `command` is executed directly as the PTY's root process
   * via `$SHELL -l -c <command>` instead of being typed into an
   * interactive shell. Used for AI tool tabs so no shell prompt flashes
   * before the tool takes over the terminal.
   */
  execCommand?: boolean;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  tabs: Tab[];
  activeTabId: string | null;
  tools: ToolConfig[];
  editors: EditorConfig[];
  uiFontSize: number;
  terminalFontSize: number;
  themeMode: ThemeMode;
  themeTemplate: ThemeTemplateId;
  terminalTheme: TerminalThemeId;
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
  | { type: "SET_THEME_MODE"; mode: ThemeMode }
  | { type: "SET_THEME_TEMPLATE"; template: ThemeTemplateId }
  | { type: "SET_TERMINAL_THEME"; theme: TerminalThemeId }
  | { type: "SET_TOOLS"; tools: ToolConfig[] }
  | { type: "SET_EDITORS"; editors: EditorConfig[] }
  | {
      type: "IMPORT_SETTINGS";
      settings: {
        projects: Project[];
        tools: ToolConfig[];
        editors: EditorConfig[];
        uiFontSize: number;
        terminalFontSize: number;
        themeMode: ThemeMode;
        themeTemplate: ThemeTemplateId;
        terminalTheme: TerminalThemeId;
      };
    }
  | { type: "SET_VIEW"; view: "terminals" | "settings" | "project-settings" };
