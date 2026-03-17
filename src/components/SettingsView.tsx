import { useAppDispatch, useAppSelector } from "../context";
import {
  TERMINAL_THEMES,
  THEME_TEMPLATES,
  type ThemeMode,
} from "../themes";

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

  function adjustUiFontSize(delta: number) {
    const next = Math.min(24, Math.max(10, uiFontSize + delta));
    dispatch({ type: "SET_UI_FONT_SIZE", size: next });
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
              Choose a dedicated palette for terminals.
            </span>
          </div>

          <div className="theme-template-grid">
            {TERMINAL_THEMES.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-pressed={terminalTheme === template.id}
                className={`theme-template-card${terminalTheme === template.id ? " active" : ""}`}
                onClick={() =>
                  dispatch({
                    type: "SET_TERMINAL_THEME",
                    terminalTheme: template.id,
                  })
                }
              >
                <div className="theme-template-preview" aria-hidden="true">
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.background }}
                    />
                    <span className="theme-template-tone-label">Bg</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.foreground }}
                    />
                    <span className="theme-template-tone-label">Text</span>
                  </span>
                  <span className="theme-template-tone">
                    <span
                      className="theme-template-swatch"
                      style={{ background: template.preview.accent }}
                    />
                    <span className="theme-template-tone-label">Cursor</span>
                  </span>
                </div>

                <div className="theme-template-name-row">
                  <span className="theme-template-name">{template.name}</span>
                  {terminalTheme === template.id && (
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
    </div>
  );
}
