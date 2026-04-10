import {
  EditorConfig,
  Project,
  ProjectCommand,
  ToolConfig,
} from "./types";
import {
  DEFAULT_THEME_SETTINGS,
  isThemeMode,
  isTerminalThemeId,
  isThemeTemplateId,
  ThemeMode,
  ThemeTemplateId,
  TerminalThemeId,
} from "./themes";

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  app: "vybz";
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

export type ImportedSettings = ExportPayload["settings"];

interface BuildArgs {
  projects: Project[];
  tools: ToolConfig[];
  editors: EditorConfig[];
  uiFontSize: number;
  terminalFontSize: number;
  themeMode: ThemeMode;
  themeTemplate: ThemeTemplateId;
  terminalTheme: TerminalThemeId;
}

export function buildExportPayload(args: BuildArgs): ExportPayload {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "vybz",
    settings: {
      projects: args.projects,
      tools: args.tools,
      editors: args.editors,
      uiFontSize: args.uiFontSize,
      terminalFontSize: args.terminalFontSize,
      themeMode: args.themeMode,
      themeTemplate: args.themeTemplate,
      terminalTheme: args.terminalTheme,
    },
  };
}

export function serializeExportPayload(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectCommand(value: unknown): value is ProjectCommand {
  if (!isStringRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.command === "string"
  );
}

function isProject(value: unknown): value is Project {
  if (!isStringRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.path !== "string" ||
    typeof value.name !== "string" ||
    typeof value.color !== "string"
  ) {
    return false;
  }
  if (value.commands !== undefined) {
    if (!Array.isArray(value.commands)) return false;
    if (!value.commands.every(isProjectCommand)) return false;
  }
  return true;
}

function isToolConfig(value: unknown): value is ToolConfig {
  if (!isStringRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string";
}

function isEditorConfig(value: unknown): value is EditorConfig {
  if (!isStringRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.cmd === "string"
  );
}

function clampFontSize(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export function parseImportPayload(rawJson: string): ImportedSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new ImportError(
      `File is not valid JSON: ${(error as Error).message}`,
    );
  }

  if (!isStringRecord(parsed)) {
    throw new ImportError("Export file must be a JSON object.");
  }

  if (parsed.app !== "vybz") {
    throw new ImportError("Export file is not a Vybz settings export.");
  }

  if (typeof parsed.schemaVersion !== "number") {
    throw new ImportError("Export file is missing schemaVersion.");
  }

  if (parsed.schemaVersion > EXPORT_SCHEMA_VERSION) {
    throw new ImportError(
      `Export file uses schema v${parsed.schemaVersion}, which is newer than this app supports (v${EXPORT_SCHEMA_VERSION}).`,
    );
  }

  const settings = parsed.settings;
  if (!isStringRecord(settings)) {
    throw new ImportError("Export file is missing the `settings` object.");
  }

  const projectsRaw = settings.projects;
  if (!Array.isArray(projectsRaw) || !projectsRaw.every(isProject)) {
    throw new ImportError("Export file has invalid `projects` data.");
  }

  const toolsRaw = settings.tools;
  if (!Array.isArray(toolsRaw) || !toolsRaw.every(isToolConfig)) {
    throw new ImportError("Export file has invalid `tools` data.");
  }

  const editorsRaw = settings.editors;
  if (!Array.isArray(editorsRaw) || !editorsRaw.every(isEditorConfig)) {
    throw new ImportError("Export file has invalid `editors` data.");
  }

  return {
    projects: projectsRaw,
    tools: toolsRaw,
    editors: editorsRaw,
    uiFontSize: clampFontSize(settings.uiFontSize, 14, 10, 24),
    terminalFontSize: clampFontSize(settings.terminalFontSize, 15, 10, 28),
    themeMode: isThemeMode(settings.themeMode)
      ? settings.themeMode
      : DEFAULT_THEME_SETTINGS.themeMode,
    themeTemplate: isThemeTemplateId(settings.themeTemplate)
      ? settings.themeTemplate
      : DEFAULT_THEME_SETTINGS.themeTemplate,
    terminalTheme: isTerminalThemeId(settings.terminalTheme)
      ? settings.terminalTheme
      : DEFAULT_THEME_SETTINGS.terminalTheme,
  };
}

export function defaultExportFileName() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `vybz-settings-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
