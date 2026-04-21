import { memo, useCallback, useRef, useState } from "react";
import { useTerminal } from "../hooks/useTerminal";

interface TerminalViewProps {
  label: string;
  cwd: string;
  active: boolean;
  command?: string;
  execCommand?: boolean;
  shiftEnterSequence?: string;
  terminalFontSize?: number;
  onClose: () => void;
}

interface TerminalSessionProps {
  cwd: string;
  active: boolean;
  command?: string;
  execCommand?: boolean;
  shiftEnterSequence?: string;
  terminalFontSize?: number;
  onExit: () => void;
}

function TerminalSessionComponent({
  cwd,
  active,
  command,
  execCommand,
  shiftEnterSequence,
  terminalFontSize,
  onExit,
}: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadingStartup } = useTerminal(containerRef, cwd, active, {
    command,
    execCommand,
    fontSize: terminalFontSize,
    shiftEnterSequence,
    onExit,
  });

  return (
    <>
      <div ref={containerRef} className="terminal-container" />
      {loadingStartup ? (
        <div className="terminal-startup-overlay" aria-hidden="true">
          <div className="terminal-startup-spinner" />
        </div>
      ) : null}
    </>
  );
}

const TerminalSession = memo(TerminalSessionComponent);

export const TerminalView = memo(function TerminalView({
  label,
  cwd,
  active,
  command,
  execCommand,
  shiftEnterSequence,
  terminalFontSize,
  onClose,
}: TerminalViewProps) {
  const [restartKey, setRestartKey] = useState(0);
  const [hasExited, setHasExited] = useState(false);

  const handleExit = useCallback(() => {
    setHasExited(true);
  }, []);

  const handleReopen = useCallback(() => {
    setHasExited(false);
    setRestartKey((current) => current + 1);
  }, []);

  return (
    <div
      className="terminal-wrapper"
      style={{ display: active ? "block" : "none" }}
    >
      <TerminalSession
        key={restartKey}
        active={active}
        command={command}
        cwd={cwd}
        execCommand={execCommand}
        onExit={handleExit}
        shiftEnterSequence={shiftEnterSequence}
        terminalFontSize={terminalFontSize}
      />
      {hasExited ? (
        <div className="terminal-exit-overlay">
          <div className="terminal-exit-card">
            <div className="terminal-exit-title">{label} exited</div>
            <div className="terminal-exit-actions">
              <button
                type="button"
                className="terminal-exit-btn primary"
                onClick={handleReopen}
              >
                Reopen
              </button>
              <button
                type="button"
                className="terminal-exit-btn"
                onClick={onClose}
              >
                Close Tab
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
