import { memo, useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tab, ToolType, ProjectCommand } from "../types";
import { ToolIcon } from "./ToolIcon";

const TOOL_COMMANDS: Record<ToolType, string | undefined> = {
  Shell: undefined,
  Claude: "claude\r",
  Codex: "codex\r",
  OpenCode: "opencode\r",
  Pi: "pi\r",
};

const TOOL_TYPES: ToolType[] = ["Shell", "Claude", "Codex", "OpenCode", "Pi"];
const COMMAND_TO_TOOL = new Map<string, ToolType>(
  TOOL_TYPES.flatMap((tool) => {
    const command = TOOL_COMMANDS[tool];
    return command ? [[command, tool]] : [];
  }),
);

const EDITORS = [
  { name: "Zed", cmd: "zed" },
  { name: "VS Code", cmd: "code" },
  { name: "Cursor", cmd: "cursor" },
  { name: "Antigravity", cmd: "antigravity" },
  { name: "VSCodium", cmd: "codium" },
] as const;

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  projectPath: string;
  projectCommands: ProjectCommand[];
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: (tool: ToolType) => void;
  onRename: (tabId: string, label: string) => void;
  onRunCommand: (label: string, command: string) => void;
  onProjectSettings: () => void;
}

export const TabBar = memo(function TabBar({
  tabs, activeTabId, projectPath, projectCommands,
  onSelect, onClose, onAdd, onRename, onRunCommand, onProjectSettings,
}: TabBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const toolRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openDropdown) return;
    function handleClick(e: MouseEvent) {
      const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
        tools: toolRef, editors: editorRef, run: runRef,
      };
      const ref = openDropdown ? refs[openDropdown] : undefined;
      if (ref?.current && !ref.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  function toggle(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  function startRename(tabId: string, currentLabel: string) {
    setEditingTabId(tabId);
    setEditValue(currentLabel);
  }

  function commitRename() {
    if (editingTabId && editValue.trim()) {
      onRename(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  }

  function openEditor(cmd: string) {
    invoke("open_in_editor", { editor: cmd, path: projectPath });
    setOpenDropdown(null);
  }

  function getToolType(tab: Tab): ToolType {
    return tab.command ? COMMAND_TO_TOOL.get(tab.command) ?? "Shell" : "Shell";
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab.id, tab.label)}
          >
            <span className="tab-icon">
              <ToolIcon tool={getToolType(tab)} size={14} />
            </span>
            {editingTabId === tab.id ? (
              <input
                ref={editInputRef}
                className="tab-rename-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingTabId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tab-label">{tab.label}</span>
            )}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tab-actions">
        {/* New tab */}
        <div className="tab-add-wrapper" ref={toolRef}>
          <button className="tab-action-btn" onClick={() => toggle("tools")} title="New tab">
            +
          </button>
          {openDropdown === "tools" && (
            <div className="tool-dropdown">
              {TOOL_TYPES.map((tool) => (
                <div
                  key={tool}
                  className="tool-dropdown-item"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => { onAdd(tool); setOpenDropdown(null); }}
                >
                  <span className="tool-dropdown-icon">
                    <ToolIcon tool={tool} size={16} />
                  </span>
                  {tool}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run command */}
        <div className="tab-add-wrapper" ref={runRef}>
          <button className="tab-action-btn" onClick={() => toggle("run")} title="Run command">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
          {openDropdown === "run" && (
            <div className="tool-dropdown">
              {projectCommands.length === 0 ? (
                <div className="tool-dropdown-item tool-dropdown-empty" onMouseDown={(e) => e.stopPropagation()}>
                  No commands configured
                </div>
              ) : (
                projectCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="tool-dropdown-item"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => { onRunCommand(cmd.name, cmd.command); setOpenDropdown(null); }}
                  >
                    <span className="tool-dropdown-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" y1="19" x2="20" y2="19" />
                      </svg>
                    </span>
                    {cmd.name}
                  </div>
                ))
              )}
              <div className="tool-dropdown-divider" />
              <div
                className="tool-dropdown-item"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => { onProjectSettings(); setOpenDropdown(null); }}
              >
                Manage commands...
              </div>
            </div>
          )}
        </div>

        {/* Project settings */}
        <button className="tab-action-btn" onClick={onProjectSettings} title="Project settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Open in editor */}
        <div className="tab-add-wrapper" ref={editorRef}>
          <button className="tab-action-btn" onClick={() => toggle("editors")} title="Open in editor">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          {openDropdown === "editors" && (
            <div className="tool-dropdown">
              {EDITORS.map((editor) => (
                <div
                  key={editor.cmd}
                  className="tool-dropdown-item"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => openEditor(editor.cmd)}
                >
                  {editor.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export { TOOL_COMMANDS };
