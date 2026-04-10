import { memo } from "react";
import { Tab } from "../types";
import { TerminalView } from "./TerminalView";

interface TerminalPanelsProps {
  activeTabId: string | null;
  projectPathsById: ReadonlyMap<string, string>;
  showTerminals: boolean;
  tabs: Tab[];
  terminalFontSize: number;
  onCloseTab: (tabId: string) => void;
}

export const TerminalPanels = memo(function TerminalPanels({
  activeTabId,
  projectPathsById,
  showTerminals,
  tabs,
  terminalFontSize,
  onCloseTab,
}: TerminalPanelsProps) {
  return (
    <div
      className="terminal-area"
      style={{ display: showTerminals ? undefined : "none" }}
    >
      {tabs.map((tab) => {
        const cwd = projectPathsById.get(tab.projectId);
        if (!cwd) {
          return null;
        }

        return (
          <TerminalView
            key={tab.id}
            active={tab.id === activeTabId && showTerminals}
            command={tab.command}
            execCommand={tab.execCommand}
            cwd={cwd}
            label={tab.label}
            onClose={() => onCloseTab(tab.id)}
            terminalFontSize={terminalFontSize}
          />
        );
      })}
    </div>
  );
});
