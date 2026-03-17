import { useApp } from "../context";

export function SettingsView() {
  const { state, dispatch } = useApp();

  function adjustUiFontSize(delta: number) {
    const next = Math.min(24, Math.max(10, state.uiFontSize + delta));
    dispatch({ type: "SET_UI_FONT_SIZE", size: next });
  }

  return (
    <div className="settings-view">
      <h2 className="settings-title">Settings</h2>

      <div className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>

        <div className="settings-row">
          <span className="settings-label">UI Font Size</span>
          <div className="font-size-control">
            <button
              className="font-size-btn"
              onClick={() => adjustUiFontSize(-1)}
              disabled={state.uiFontSize <= 10}
            >
              -
            </button>
            <span className="font-size-value">{state.uiFontSize}</span>
            <button
              className="font-size-btn"
              onClick={() => adjustUiFontSize(1)}
              disabled={state.uiFontSize >= 24}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
