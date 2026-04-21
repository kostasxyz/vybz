import { memo, useMemo } from "react";
import { Tab, ToolConfig } from "../types";
import {
  buildCommandToToolMap,
  resolveTabTool,
  shiftEnterSequenceForTool,
} from "../tool-resolution";
import { TerminalView } from "./TerminalView";

interface TerminalPanelsProps {
  activeTabId: string | null;
  projectPathsById: ReadonlyMap<string, string>;
  showTerminals: boolean;
  tabs: Tab[];
  terminalFontSize: number;
  tools: ToolConfig[];
  onCloseTab: (tabId: string) => void;
}

export const TerminalPanels = memo(function TerminalPanels({
  activeTabId,
  projectPathsById,
  showTerminals,
  tabs,
  terminalFontSize,
  tools,
  onCloseTab,
}: TerminalPanelsProps) {
  const commandToTool = useMemo(() => buildCommandToToolMap(tools), [tools]);

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

        const tool = resolveTabTool(tab, tools, commandToTool);
        const shiftEnterSequence = shiftEnterSequenceForTool(tool);

        return (
          <TerminalView
            key={tab.id}
            active={tab.id === activeTabId && showTerminals}
            command={tab.command}
            execCommand={tab.execCommand}
            cwd={cwd}
            label={tab.label}
            onClose={() => onCloseTab(tab.id)}
            shiftEnterSequence={shiftEnterSequence}
            terminalFontSize={terminalFontSize}
          />
        );
      })}
    </div>
  );
});
