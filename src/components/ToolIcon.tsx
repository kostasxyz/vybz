import type { ReactElement } from "react";
import Claude from "@lobehub/icons/es/Claude";
import Codex from "@lobehub/icons/es/Codex";
import OpenCode from "@lobehub/icons/es/OpenCode";

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

const GenericToolIcon = ({ size = 16 }: { size?: number }) => (
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
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
    <path d="M8.5 11V7a3.5 3.5 0 0 1 7 0v4" />
    <line x1="12" y1="4" x2="12" y2="1" />
    <circle cx="12" cy="1" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const KNOWN_TOOLS: Record<string, (props: { size: number }) => ReactElement> = {
  shell: ({ size }) => <TerminalIcon size={size} />,
  claude: ({ size }) => <Claude.Color size={size} />,
  codex: ({ size }) => <Codex.Color size={size} />,
  opencode: ({ size }) => <OpenCode size={size} />,
  pi: ({ size }) => <PiIcon size={size} />,
};

export function ToolIcon({ toolId, iconUrl, size = 16 }: { toolId: string; iconUrl?: string; size?: number }) {
  if (iconUrl) {
    return <img src={iconUrl} width={size} height={size} alt="" style={{ objectFit: "contain" }} />;
  }
  const Icon = KNOWN_TOOLS[toolId];
  return Icon ? <Icon size={size} /> : <GenericToolIcon size={size} />;
}
