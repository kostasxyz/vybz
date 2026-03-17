import { memo, useRef } from "react";
import { useTerminal } from "../hooks/useTerminal";

interface TerminalViewProps {
  cwd: string;
  active: boolean;
  command?: string;
  terminalFontSize?: number;
}

export const TerminalView = memo(function TerminalView({
  cwd,
  active,
  command,
  terminalFontSize,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(containerRef, cwd, active, { command, fontSize: terminalFontSize });

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{ display: active ? "block" : "none" }}
    />
  );
});
