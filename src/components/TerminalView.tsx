import { useRef } from "react";
import { useTerminal } from "../hooks/useTerminal";

interface TerminalViewProps {
  cwd: string;
  active: boolean;
}

export function TerminalView({ cwd, active }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(containerRef, cwd, active);

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{ display: active ? "block" : "none" }}
    />
  );
}
