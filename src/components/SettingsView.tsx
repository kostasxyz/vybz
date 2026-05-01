import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from "@tauri-apps/api/path";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useAppDispatch, useAppSelector } from "../context";
import { Action, EditorConfig, ToolConfig } from "../types";
import { EditorIcon } from "./EditorIcon";
import { ToolIcon } from "./ToolIcon";
import { ProjectColorPicker } from "./ProjectColorPicker";
import {
  APP_THEMES,
  AppTheme,
  TERMINAL_THEMES,
  getTerminalTheme,
  getThemeColors,
  type ThemeColors,
} from "../themes";
import {
  buildExportPayload,
  defaultExportFileName,
  ImportError,
  parseImportPayload,
  serializeExportPayload,
} from "../exportImport";

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
];

interface ThemePickerProps {
  label: string;
  themes: AppTheme[];
  activeId: string;
  colors: ThemeColors;
  onSelectTheme: (id: string) => Action;
  onChangeColor: (themeId: string, key: keyof ThemeColors, value: string) => Action;
  popoverScope: string;
}

function ThemePicker({
  label,
  themes,
  activeId,
  colors,
  onSelectTheme,
  onChangeColor,
  popoverScope,
}: ThemePickerProps) {
  const dispatch = useAppDispatch();
  const [openField, setOpenField] = useState<keyof ThemeColors | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openField) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpenField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openField]);

  return (
    <div className="theme-picker-card">
      <div className="settings-row">
        <div className="settings-copy">
          <span className="settings-label">{label}</span>
        </div>
        <select
          className="theme-select"
          value={activeId}
          onChange={(e) => dispatch(onSelectTheme(e.target.value))}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>

      {COLOR_FIELDS.map(({ key, label: fieldLabel }) => {
        const value = colors[key];
        const isOpen = openField === key;
        return (
          <div
            key={`${popoverScope}-${key}`}
            className="settings-row theme-color-row"
          >
            <span className="settings-label">{fieldLabel}</span>
            <div className="theme-color-control">
              <button
                type="button"
                className="theme-color-chip"
                onClick={() => setOpenField(isOpen ? null : key)}
              >
                <span
                  className="theme-color-chip-swatch"
                  style={{ background: value }}
                />
                <span className="theme-color-chip-value">{value.toUpperCase()}</span>
              </button>
              {isOpen && (
                <div
                  className="theme-color-popover"
                  ref={popoverRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ProjectColorPicker
                    color={value}
                    onChange={(next) => dispatch(onChangeColor(activeId, key, next))}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SettingsView() {
  const dispatch = useAppDispatch();
  const activeThemeId = useAppSelector((state) => state.activeThemeId);
  const themeColors = useAppSelector((state) => state.themeColors);
  const activeTerminalThemeId = useAppSelector((state) => state.activeTerminalThemeId);
  const terminalBgColorOverride = useAppSelector(
    (state) => state.terminalBackgroundColor,
  );
  const terminalBgImage = useAppSelector((state) => state.terminalBackgroundImage);
  const terminalBgOpacity = useAppSelector(
    (state) => state.terminalBackgroundOpacity,
  );
  const resolvedTerminalBgColor =
    terminalBgColorOverride ?? getTerminalTheme(activeTerminalThemeId).theme.background;
  const [terminalBgPickerOpen, setTerminalBgPickerOpen] = useState(false);
  const terminalBgPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalBgPickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        terminalBgPickerRef.current &&
        !terminalBgPickerRef.current.contains(e.target as Node)
      ) {
        setTerminalBgPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [terminalBgPickerOpen]);
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

  const appColors = getThemeColors(activeThemeId, themeColors);

  function adjustUiFontSize(delta: number) {
    const next = Math.min(24, Math.max(10, uiFontSize + delta));
    dispatch({ type: "SET_UI_FONT_SIZE", size: next });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: "tool" | "editor"; id: string } | null>(null);
  const terminalBgInputRef = useRef<HTMLInputElement>(null);

  function handleTerminalBgUpload() {
    terminalBgInputRef.current?.click();
  }

  function onTerminalBgSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      dispatch({ type: "SET_TERMINAL_BACKGROUND_IMAGE", image: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function clearTerminalBg() {
    dispatch({ type: "SET_TERMINAL_BACKGROUND_IMAGE", image: null });
  }

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

  async function handleExportSettings() {
    setBackupStatus({ kind: "idle" });
    try {
      const payload = buildExportPayload({
        projects,
        tools,
        editors,
        uiFontSize,
        terminalFontSize,
        activeThemeId,
        themeColors,
        activeTerminalThemeId,
        terminalBackgroundColor: terminalBgColorOverride,
        terminalBackgroundImage: terminalBgImage,
        terminalBackgroundOpacity: terminalBgOpacity,
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

        <ThemePicker
          label="Application Theme"
          themes={APP_THEMES}
          activeId={activeThemeId}
          colors={appColors}
          onSelectTheme={(themeId) => ({ type: "SET_ACTIVE_THEME", themeId })}
          onChangeColor={(themeId, key, value) => ({
            type: "SET_THEME_COLOR",
            themeId,
            key,
            value,
          })}
          popoverScope="app"
        />

        <div className="theme-picker-card">
          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Terminal Theme</span>
            </div>
            <select
              className="theme-select"
              value={activeTerminalThemeId}
              onChange={(e) =>
                dispatch({
                  type: "SET_ACTIVE_TERMINAL_THEME",
                  themeId: e.target.value,
                })
              }
            >
              {TERMINAL_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-row theme-color-row">
            <span className="settings-label">Background Color</span>
            <div className="theme-color-control">
              <button
                type="button"
                className="theme-color-chip"
                onClick={() => setTerminalBgPickerOpen((v) => !v)}
              >
                <span
                  className="theme-color-chip-swatch"
                  style={{ background: resolvedTerminalBgColor }}
                />
                <span className="theme-color-chip-value">
                  {resolvedTerminalBgColor.toUpperCase()}
                </span>
              </button>
              {terminalBgPickerOpen && (
                <div
                  className="theme-color-popover"
                  ref={terminalBgPickerRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ProjectColorPicker
                    color={resolvedTerminalBgColor}
                    onChange={(next) =>
                      dispatch({
                        type: "SET_TERMINAL_BACKGROUND_COLOR",
                        color: next,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-label">Background Image</span>
            <div className="terminal-bg-control">
              <input
                ref={terminalBgInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                style={{ display: "none" }}
                onChange={onTerminalBgSelected}
              />
              <span
                className="terminal-bg-thumb"
                style={
                  terminalBgImage
                    ? { backgroundImage: `url("${terminalBgImage}")` }
                    : undefined
                }
                aria-hidden="true"
              />
              <button
                type="button"
                className="terminal-bg-btn"
                onClick={handleTerminalBgUpload}
              >
                {terminalBgImage ? "Replace" : "Upload"}
              </button>
              {terminalBgImage && (
                <button
                  type="button"
                  className="terminal-bg-btn danger"
                  onClick={clearTerminalBg}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-label">Image Opacity</span>
            <div className="opacity-slider-control">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={terminalBgOpacity}
                className="opacity-slider"
                onChange={(e) =>
                  dispatch({
                    type: "SET_TERMINAL_BACKGROUND_OPACITY",
                    opacity: Number(e.target.value),
                  })
                }
              />
              <span className="opacity-slider-value">{terminalBgOpacity}</span>
            </div>
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
