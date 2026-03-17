import { useEffect, useCallback } from "react";
import { useApp } from "../context";
import { ToolType } from "../types";
import { TerminalView } from "./TerminalView";
import { TabBar, TOOL_COMMANDS } from "./TabBar";
import { SettingsView } from "./SettingsView";
import { ProjectSettingsView } from "./ProjectSettingsView";

let tabCounter = Date.now();

function createTabId(): string {
  tabCounter++;
  return `tab-${tabCounter}`;
}

export function MainArea() {
  const { state, dispatch } = useApp();

  const activeProjectId = state.activeProjectId;
  const tabs = state.tabs;
  const activeTabId = state.activeTabId;
  const projectTabs = tabs.filter((t) => t.projectId === activeProjectId);

  const addTab = useCallback(
    (projectId: string, tool: ToolType) => {
      dispatch({
        type: "ADD_TAB",
        tab: {
          id: createTabId(),
          projectId,
          label: tool,
          command: TOOL_COMMANDS[tool],
        },
      });
    },
    [dispatch],
  );

  const runCommand = useCallback(
    (projectId: string, label: string, command: string) => {
      dispatch({
        type: "ADD_TAB",
        tab: {
          id: createTabId(),
          projectId,
          label,
          command: command + "\r",
        },
      });
    },
    [dispatch],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      dispatch({ type: "REMOVE_TAB", tabId });
    },
    [dispatch],
  );

  const renameTab = useCallback(
    (tabId: string, label: string) => {
      dispatch({ type: "RENAME_TAB", tabId, label });
    },
    [dispatch],
  );

  // Auto-create shell tab when switching to a project that has no tabs
  useEffect(() => {
    if (!activeProjectId) return;
    const hasTabs = tabs.some((t) => t.projectId === activeProjectId);
    if (!hasTabs) {
      addTab(activeProjectId, "Shell");
    } else {
      const projectTabs = tabs.filter((t) => t.projectId === activeProjectId);
      const lastTab = projectTabs[projectTabs.length - 1];
      if (lastTab) {
        const currentTabProject = tabs.find((t) => t.id === activeTabId)?.projectId;
        if (currentTabProject !== activeProjectId) {
          dispatch({ type: "SET_ACTIVE_TAB", tabId: lastTab.id });
        }
      }
    }
  }, [activeProjectId]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === "t") {
        e.preventDefault();
        if (activeProjectId) {
          addTab(activeProjectId, "Shell");
        }
      } else if (e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        dispatch({
          type: "SET_TERMINAL_FONT_SIZE",
          size: Math.min(28, state.terminalFontSize + 2),
        });
      } else if (e.key === "-") {
        e.preventDefault();
        dispatch({
          type: "SET_TERMINAL_FONT_SIZE",
          size: Math.max(8, state.terminalFontSize - 2),
        });
      } else if (e.key === "0") {
        e.preventDefault();
        dispatch({ type: "SET_TERMINAL_FONT_SIZE", size: 15 });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProjectId, activeTabId, state.terminalFontSize, addTab, closeTab, dispatch]);

  const showTerminals = state.view === "terminals";
  const activeProject = state.projects.find((p) => p.id === activeProjectId);

  return (
    <div className="main-area">
      {showTerminals && activeProjectId && activeProject && (
        <TabBar
          tabs={projectTabs}
          activeTabId={activeTabId}
          projectPath={activeProject.path}
          projectCommands={activeProject.commands ?? []}
          onSelect={(id) => dispatch({ type: "SET_ACTIVE_TAB", tabId: id })}
          onClose={closeTab}
          onAdd={(tool) => addTab(activeProjectId, tool)}
          onRename={renameTab}
          onRunCommand={(label, cmd) => runCommand(activeProjectId, label, cmd)}
          onProjectSettings={() => dispatch({ type: "SET_VIEW", view: "project-settings" })}
        />
      )}
      {showTerminals && tabs.length === 0 && !activeProjectId && (
        <div className="empty-state">
          <p>Add a project to get started</p>
        </div>
      )}
      <div className="terminal-area" style={{ display: showTerminals ? undefined : "none" }}>
        {tabs.map((tab) => {
          const project = state.projects.find((p) => p.id === tab.projectId);
          if (!project) return null;
          return (
            <TerminalView
              key={tab.id}
              cwd={project.path}
              active={tab.id === activeTabId && showTerminals}
              command={tab.command}
              terminalFontSize={state.terminalFontSize}
            />
          );
        })}
      </div>
      {state.view === "settings" && <SettingsView />}
      {state.view === "project-settings" && <ProjectSettingsView />}
    </div>
  );
}
