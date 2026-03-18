import { useRef, useState, type ReactElement } from "react";
import { useAppDispatch, useAppSelector } from "../context";
import { EditorConfig } from "../types";
import { EditorIcon } from "./EditorIcon";
import {
  THEME_TEMPLATES,
  TERMINAL_THEMES,
  type ThemeMode,
} from "../themes";

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
  const editors = useAppSelector((state) => state.editors);
  const [newEditorName, setNewEditorName] = useState("");
  const [newEditorCmd, setNewEditorCmd] = useState("");

  function adjustUiFontSize(delta: number) {
    const next = Math.min(24, Math.max(10, uiFontSize + delta));
    dispatch({ type: "SET_UI_FONT_SIZE", size: next });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

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

  function handleIconUpload(editorId: string) {
    setUploadTargetId(editorId);
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      dispatch({
        type: "SET_EDITORS",
        editors: editors.map((ed) =>
          ed.id === uploadTargetId ? { ...ed, iconUrl: dataUrl } : ed,
        ),
      });
      setUploadTargetId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
                      onClick={() => handleIconUpload(editor.id)}
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
    </div>
  );
}
