import { useMemo } from "react";
import { ToolConfig } from "../types";
import { ToolIcon } from "./ToolIcon";

interface ProjectEmptyStateProps {
  tools: ToolConfig[];
  onPickTool: (name: string, command?: string) => void;
}

export function ProjectEmptyState({ tools, onPickTool }: ProjectEmptyStateProps) {
  const enabledTools = useMemo(
    () => tools.filter((tool) => tool.enabled !== false),
    [tools],
  );

  return (
    <div className="project-empty-state">
      <div className="project-empty-state-inner">
        <h2 className="project-empty-state-title">Start a new tab</h2>
        <p className="project-empty-state-subtitle">
          Pick a tool to open in this project.
        </p>
        <div className="project-empty-state-grid">
          {enabledTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="project-empty-state-item"
              onClick={() =>
                onPickTool(tool.name, tool.cmd ? `${tool.cmd}\r` : undefined)
              }
            >
              <span className="project-empty-state-icon">
                <ToolIcon
                  toolId={tool.id}
                  iconUrl={tool.iconUrl}
                  size={28}
                />
              </span>
              <span className="project-empty-state-label">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
