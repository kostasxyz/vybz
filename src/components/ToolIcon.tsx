import Claude from "@lobehub/icons/es/Claude";
import Codex from "@lobehub/icons/es/Codex";
import OpenCode from "@lobehub/icons/es/OpenCode";
import { ToolType } from "../types";

const TerminalIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const PiIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 800 800">
    <path fill="currentColor" fillRule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z" />
    <path fill="currentColor" d="M517.36 400H634.72V634.72H517.36Z" />
  </svg>
);

export function ToolIcon({ tool, size = 16 }: { tool: ToolType; size?: number }) {
  switch (tool) {
    case "Shell":
      return <TerminalIcon size={size} />;
    case "Claude":
      return <Claude.Color size={size} />;
    case "Codex":
      return <Codex.Color size={size} />;
    case "OpenCode":
      return <OpenCode size={size} />;
    case "Pi":
      return <PiIcon size={size} />;
  }
}
