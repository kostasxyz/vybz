import { useRef, useState, type ReactElement } from "react";
import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from "@tauri-apps/api/path";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useAppDispatch, useAppSelector } from "../context";
import { EditorConfig, ToolConfig } from "../types";
import { EditorIcon } from "./EditorIcon";
import { ToolIcon } from "./ToolIcon";
import {
  THEME_TEMPLATES,
  TERMINAL_THEMES,
  type ThemeMode,
} from "../themes";
import {
  buildExportPayload,
  defaultExportFileName,
  ImportError,
  parseImportPayload,
  serializeExportPayload,
} from "../exportImport";

const THEME_MODE_ICONS: Record<ThemeMode, ReactElement> = {
  system: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="9" rx="1" />
      <path d="M5 14h6" />
      <path d="M8 12v2" />
    </svg>
  ),
  light: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
    </svg>
  ),
  dark: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8.5a5.5 5.5 0 1 1-6-6 4.5 4.5 0 0 0 6 6z" />
    </svg>
  ),
};

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsView() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.themeMode);
  const themeTemplate = useAppSelector((state) => state.themeTemplate);
  const terminalTheme = useAppSelector((state) => state.terminalTheme);
  const uiFontSize = useAppSelector((state) => state.uiFontSize);
  const terminalFontSize = useAppSelector((state) => state.terminalFontSize);
  const projects = useAppSelector((state) => state.projects);
  const tools = useAppSelector((state) => state.tools);
  const editors = useAppSelector((state) => state.editors);
  const [newToolName, setNewToolName] = useState("");
  const [newToolCmd, setNewToolCmd] = useState("");
  const [newEditorName, setNewEditorName] = useState("");
  const [newEditorCmd, setNewEditorCmd] = useState("");
  const [backupStatus, setBackupStatus] = useState<
    | { kind: "idle" }
    | { kind: "info"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  function adjustUiFontSize(delta: number) {
    const next = Math.min(24, Math.max(10, uiFontSize + delta));
    dispatch({ type: "SET_UI_FONT_SIZE", size: next });
  }

  // Shared upload logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: "tool" | "editor"; id: string } | null>(null);

  function handleIconUpload(type: "tool" | "editor", id: string) {
    setUploadTarget({ type, id });
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (uploadTarget.type === "editor") {
        dispatch({
          type: "SET_EDITORS",
          editors: editors.map((ed) =>
            ed.id === uploadTarget.id ? { ...ed, iconUrl: dataUrl } : ed,
          ),
        });
      } else {
        dispatch({
          type: "SET_TOOLS",
          tools: tools.map((t) =>
            t.id === uploadTarget.id ? { ...t, iconUrl: dataUrl } : t,
          ),
        });
      }
      setUploadTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Tool handlers
  function addTool() {
    if (!newToolName.trim() || !newToolCmd.trim()) return;
    const tool: ToolConfig = {
      id: `tool-${Date.now()}`,
      name: newToolName.trim(),
      cmd: newToolCmd.trim(),
      builtin: false,
      enabled: true,
    };
    dispatch({ type: "SET_TOOLS", tools: [...tools, tool] });
    setNewToolName("");
    setNewToolCmd("");
  }

  function removeTool(toolId: string) {
    dispatch({ type: "SET_TOOLS", tools: tools.filter((t) => t.id !== toolId) });
  }

  function toggleTool(toolId: string) {
    dispatch({
      type: "SET_TOOLS",
      tools: tools.map((t) =>
        t.id === toolId ? { ...t, enabled: t.enabled === false ? true : false } : t,
      ),
    });
  }

  // Editor handlers
  function addEditor() {
    if (!newEditorName.trim() || !newEditorCmd.trim()) return;
    const editor: EditorConfig = {
      id: `editor-${Date.now()}`,
      name: newEditorName.trim(),
      cmd: newEditorCmd.trim(),
      builtin: false,
      enabled: true,
    };
    dispatch({ type: "SET_EDITORS", editors: [...editors, editor] });
    setNewEditorName("");
    setNewEditorCmd("");
  }

  function removeEditor(editorId: string) {
    dispatch({ type: "SET_EDITORS", editors: editors.filter((e) => e.id !== editorId) });
  }

  function toggleEditor(editorId: string) {
    dispatch({
      type: "SET_EDITORS",
      editors: editors.map((e) =>
        e.id === editorId ? { ...e, enabled: e.enabled === false ? true : false } : e,
      ),
    });
  }

  // Backup & restore handlers
  async function handleExportSettings() {
    setBackupStatus({ kind: "idle" });
    try {
      const payload = buildExportPayload({
        projects,
        tools,
        editors,
        uiFontSize,
        terminalFontSize,
        themeMode,
        themeTemplate,
        terminalTheme,
      });
      const home = await homeDir();
      const defaultPath = await join(home, defaultExportFileName());
      const targetPath = await saveDialog({
        title: "Export Vybz Settings",
        defaultPath,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!targetPath) return;
      await invoke("write_text_file", {
        path: targetPath,
        contents: serializeExportPayload(payload),
      });
      setBackupStatus({
        kind: "info",
        message: `Exported to ${targetPath}`,
      });
    } catch (error) {
      setBackupStatus({
        kind: "error",
        message: `Export failed: ${(error as Error).message ?? String(error)}`,
      });
    }
  }

  async function handleImportSettings() {
    setBackupStatus({ kind: "idle" });
    try {
      const home = await homeDir();
      const selected = await openDialog({
        title: "Import Vybz Settings",
        multiple: false,
        defaultPath: home,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!selected || Array.isArray(selected)) return;
      const raw = await invoke<string>("read_text_file", { path: selected });
      const imported = parseImportPayload(raw);
      dispatch({ type: "IMPORT_SETTINGS", settings: imported });
      setBackupStatus({
        kind: "info",
        message: `Imported ${imported.projects.length} project${
          imported.projects.length === 1 ? "" : "s"
        } and settings.`,
      });
    } catch (error) {
      const message =
        error instanceof ImportError
          ? error.message
          : (error as Error).message ?? String(error);
      setBackupStatus({ kind: "error", message: `Import failed: ${message}` });
    }
  }

  return (
    <div className="settings-view">
      <h2 className="settings-title">Settings</h2>

      <div className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>

        <div className="settings-row settings-row-align-start">
          <div className="settings-copy">
            <span className="settings-label">Color Mode</span>
            <span className="settings-help">
              Follow the system, or force light or dark.
            </span>
          </div>
          <div className="theme-mode-group">
            {THEME_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={themeMode === option.value}
                className={`theme-mode-btn${themeMode === option.value ? " active" : ""}`}
                onClick={() =>
                  dispatch({ type: "SET_THEME_MODE", mode: option.value })
                }
              >
                {THEME_MODE_ICONS[option.value]}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-stack">
          <div className="settings-copy">
            <span className="settings-label">Template</span>
            <span className="settings-help">
              Templates define the palette for both light and dark variants.
            </span>
          </div>

          <div className="theme-template-grid">
            {THEME_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-pressed={themeTemplate === template.id}
                className={`theme-template-card${themeTemplate === template.id ? " active" : ""}`}
                onClick={() =>
                  dispatch({
                    type: "SET_THEME_TEMPLATE",
                    template: template.id,
                  })
                }
              >
                <div className="theme-template-preview" aria-hidden="true">
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.light }}
                    />
                    <span className="theme-template-tone-label">Light</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.dark }}
                    />
                    <span className="theme-template-tone-label">Dark</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.accent }}
                    />
                    <span className="theme-template-tone-label">Accent</span>
                  </span>
                </div>

                <div className="theme-template-name-row">
                  <span className="theme-template-name">{template.name}</span>
                  {themeTemplate === template.id && (
                    <span className="theme-template-selected">Selected</span>
                  )}
                </div>

                <span className="theme-template-description">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-stack">
          <div className="settings-copy">
            <span className="settings-label">Terminal Theme</span>
            <span className="settings-help">
              Color palette for terminal output and ANSI colors.
            </span>
          </div>

          <div className="theme-template-grid">
            {TERMINAL_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={terminalTheme === theme.id}
                className={`theme-template-card${terminalTheme === theme.id ? " active" : ""}`}
                onClick={() =>
                  dispatch({
                    type: "SET_TERMINAL_THEME",
                    theme: theme.id,
                  })
                }
              >
                <div className="theme-template-preview" aria-hidden="true">
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: theme.preview.background }}
                    />
                    <span className="theme-template-tone-label">BG</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: theme.preview.foreground }}
                    />
                    <span className="theme-template-tone-label">FG</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: theme.preview.accent }}
                    />
                    <span className="theme-template-tone-label">Accent</span>
                  </span>
                </div>

                <div className="theme-template-name-row">
                  <span className="theme-template-name">{theme.name}</span>
                  {terminalTheme === theme.id && (
                    <span className="theme-template-selected">Selected</span>
                  )}
                </div>

                <span className="theme-template-description">
                  {theme.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-copy">
            <span className="settings-label">UI Font Size</span>
          </div>
          <div className="font-size-control">
            <button
              type="button"
              className="font-size-btn"
              onClick={() => adjustUiFontSize(-1)}
              disabled={uiFontSize <= 10}
            >
              -
            </button>
            <span className="font-size-value">{uiFontSize}</span>
            <button
              type="button"
              className="font-size-btn"
              onClick={() => adjustUiFontSize(1)}
              disabled={uiFontSize >= 24}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Agent Tools</h3>
        <span className="settings-help" style={{ marginBottom: 12, display: "block" }}>
          Configure which tools appear in the new tab menu.
        </span>

        {tools.length > 0 && (
          <div className="command-list">
            {tools.map((tool) => {
              const isBuiltin = tool.builtin !== false;
              const isEnabled = tool.enabled !== false;
              return (
                <div key={tool.id} className={`command-row${isEnabled ? "" : " command-row-disabled"}`}>
                  <span className="command-icon">
                    <ToolIcon toolId={tool.id} iconUrl={tool.iconUrl} size={18} />
                  </span>
                  <div className="command-info">
                    <span className="command-name">{tool.name}</span>
                    {tool.cmd && <span className="command-value">{tool.cmd}</span>}
                  </div>
                  {!isBuiltin && (
                    <button
                      className="command-icon-upload"
                      onClick={() => handleIconUpload("tool", tool.id)}
                      title="Upload icon"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </button>
                  )}
                  {tool.id === "shell" ? null : isBuiltin ? (
                    <button
                      className={`editor-toggle${isEnabled ? " editor-toggle-on" : ""}`}
                      onClick={() => toggleTool(tool.id)}
                      title={isEnabled ? "Disable" : "Enable"}
                    >
                      <span className="editor-toggle-thumb" />
                    </button>
                  ) : (
                    <button
                      className="command-remove"
                      onClick={() => removeTool(tool.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="command-add">
          <input
            className="command-input"
            placeholder="Name (e.g. Aider)"
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTool()}
          />
          <input
            className="command-input command-input-wide"
            placeholder="Command (e.g. aider)"
            value={newToolCmd}
            onChange={(e) => setNewToolCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTool()}
          />
          <button
            className="command-add-btn"
            onClick={addTool}
            disabled={!newToolName.trim() || !newToolCmd.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Editors</h3>
        <span className="settings-help" style={{ marginBottom: 12, display: "block" }}>
          Configure which editors appear in the "Open in editor" menu.
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={onFileSelected}
        />

        {editors.length > 0 && (
          <div className="command-list">
            {editors.map((editor) => {
              const isBuiltin = editor.builtin !== false;
              const isEnabled = editor.enabled !== false;
              return (
                <div key={editor.id} className={`command-row${isEnabled ? "" : " command-row-disabled"}`}>
                  <span className="command-icon">
                    <EditorIcon cmd={editor.cmd} iconUrl={editor.iconUrl} size={18} />
                  </span>
                  <div className="command-info">
                    <span className="command-name">{editor.name}</span>
                    <span className="command-value">{editor.cmd}</span>
                  </div>
                  {!isBuiltin && (
                    <button
                      className="command-icon-upload"
                      onClick={() => handleIconUpload("editor", editor.id)}
                      title="Upload icon"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </button>
                  )}
                  {isBuiltin ? (
                    <button
                      className={`editor-toggle${isEnabled ? " editor-toggle-on" : ""}`}
                      onClick={() => toggleEditor(editor.id)}
                      title={isEnabled ? "Disable" : "Enable"}
                    >
                      <span className="editor-toggle-thumb" />
                    </button>
                  ) : (
                    <button
                      className="command-remove"
                      onClick={() => removeEditor(editor.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="command-add">
          <input
            className="command-input"
            placeholder="Name (e.g. Neovim)"
            value={newEditorName}
            onChange={(e) => setNewEditorName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEditor()}
          />
          <input
            className="command-input command-input-wide"
            placeholder="Command (e.g. nvim)"
            value={newEditorCmd}
            onChange={(e) => setNewEditorCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEditor()}
          />
          <button
            className="command-add-btn"
            onClick={addEditor}
            disabled={!newEditorName.trim() || !newEditorCmd.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Backup &amp; Restore</h3>
        <span
          className="settings-help"
          style={{ marginBottom: 12, display: "block" }}
        >
          Export your projects, custom commands, agent tools, editors, font
          sizes, and theme to a JSON file — or restore from one. Open
          terminal sessions are not included.
        </span>

        <div className="backup-actions">
          <button
            type="button"
            className="backup-btn primary"
            onClick={handleExportSettings}
          >
            Export Settings
          </button>
          <button
            type="button"
            className="backup-btn"
            onClick={handleImportSettings}
          >
            Import Settings
          </button>
        </div>

        {backupStatus.kind !== "idle" && (
          <div
            className={`backup-status backup-status-${backupStatus.kind}`}
            role="status"
          >
            {backupStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
