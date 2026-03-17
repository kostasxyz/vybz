import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
} from "react";
import { useAppDispatch, useAppSelector } from "../context";
import { ProjectCommand, Tab, ToolType } from "../types";
import { TabBar, TOOL_COMMANDS } from "./TabBar";
import { SettingsView } from "./SettingsView";
import { ProjectSettingsView } from "./ProjectSettingsView";

const TerminalPanels = lazy(async () => ({
  default: (await import("./TerminalPanels")).TerminalPanels,
}));

const EMPTY_TABS: Tab[] = [];
const EMPTY_COMMANDS: ProjectCommand[] = [];

let tabCounter = Date.now();

function createTabId(): string {
  tabCounter += 1;
  return `tab-${tabCounter}`;
}

export function MainArea() {
  const dispatch = useAppDispatch();
  const activeProjectId = useAppSelector((state) => state.activeProjectId);
  const activeTabId = useAppSelector((state) => state.activeTabId);
  const projects = useAppSelector((state) => state.projects);
  const tabs = useAppSelector((state) => state.tabs);
  const terminalFontSize = useAppSelector((state) => state.terminalFontSize);
  const view = useAppSelector((state) => state.view);

  const projectPathsById = useMemo(() => {
    const map = new Map<string, string>();

    for (const project of projects) {
      map.set(project.id, project.path);
    }

    return map;
  }, [projects]);

  const projectsById = useMemo(() => {
    const map = new Map<string, (typeof projects)[number]>();

    for (const project of projects) {
      map.set(project.id, project);
    }

    return map;
  }, [projects]);

  const tabsByProjectId = useMemo(() => {
    const map = new Map<string, typeof tabs>();

    for (const tab of tabs) {
      const projectTabs = map.get(tab.projectId);

      if (projectTabs) {
        projectTabs.push(tab);
      } else {
        map.set(tab.projectId, [tab]);
      }
    }

    return map;
  }, [tabs]);

  const tabProjectIdById = useMemo(() => {
    const map = new Map<string, string>();

    for (const tab of tabs) {
      map.set(tab.id, tab.projectId);
    }

    return map;
  }, [tabs]);

  const activeProjectTabs = activeProjectId
    ? tabsByProjectId.get(activeProjectId) ?? EMPTY_TABS
    : EMPTY_TABS;
  const activeProject = activeProjectId
    ? projectsById.get(activeProjectId) ?? null
    : null;

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
          command: `${command}\r`,
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

  const selectTab = useCallback(
    (tabId: string) => {
      dispatch({ type: "SET_ACTIVE_TAB", tabId });
    },
    [dispatch],
  );

  const openProjectSettings = useCallback(() => {
    dispatch({ type: "SET_VIEW", view: "project-settings" });
  }, [dispatch]);

  const addTabForActiveProject = useCallback(
    (tool: ToolType) => {
      if (!activeProjectId) {
        return;
      }

      addTab(activeProjectId, tool);
    },
    [activeProjectId, addTab],
  );

  const runCommandForActiveProject = useCallback(
    (label: string, command: string) => {
      if (!activeProjectId) {
        return;
      }

      runCommand(activeProjectId, label, command);
    },
    [activeProjectId, runCommand],
  );

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    if (activeProjectTabs.length === 0) {
      addTab(activeProjectId, "Shell");
      return;
    }

    const currentTabProjectId = activeTabId
      ? tabProjectIdById.get(activeTabId) ?? null
      : null;

    if (currentTabProjectId !== activeProjectId) {
      const lastTab = activeProjectTabs[activeProjectTabs.length - 1];
      if (lastTab) {
        dispatch({ type: "SET_ACTIVE_TAB", tabId: lastTab.id });
      }
    }
  }, [
    activeProjectId,
    activeProjectTabs,
    activeTabId,
    addTab,
    dispatch,
    tabProjectIdById,
  ]);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) {
      return;
    }

    if (event.key === "t") {
      event.preventDefault();
      if (activeProjectId) {
        addTab(activeProjectId, "Shell");
      }
      return;
    }

    if (event.key === "w") {
      event.preventDefault();
      if (activeTabId) {
        closeTab(activeTabId);
      }
      return;
    }

    if (event.key === "=" || event.key === "+") {
      event.preventDefault();
      dispatch({
        type: "SET_TERMINAL_FONT_SIZE",
        size: Math.min(28, terminalFontSize + 2),
      });
      return;
    }

    if (event.key === "-") {
      event.preventDefault();
      dispatch({
        type: "SET_TERMINAL_FONT_SIZE",
        size: Math.max(8, terminalFontSize - 2),
      });
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      dispatch({ type: "SET_TERMINAL_FONT_SIZE", size: 15 });
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const showTerminals = view === "terminals";
  const activeProjectCommands = activeProject?.commands ?? EMPTY_COMMANDS;

  return (
    <div className="main-area">
      {showTerminals && activeProjectId && activeProject && (
        <TabBar
          activeTabId={activeTabId}
          onAdd={addTabForActiveProject}
          onClose={closeTab}
          onProjectSettings={openProjectSettings}
          onRename={renameTab}
          onRunCommand={runCommandForActiveProject}
          onSelect={selectTab}
          projectCommands={activeProjectCommands}
          projectPath={activeProject.path}
          tabs={activeProjectTabs}
        />
      )}
      {showTerminals && tabs.length === 0 && !activeProjectId && (
        <div className="empty-state">
          <p>Add a project to get started</p>
        </div>
      )}
      {tabs.length > 0 && (
        <Suspense
          fallback={
            <div
              className="terminal-area"
              style={{ display: showTerminals ? undefined : "none" }}
            />
          }
        >
          <TerminalPanels
            activeTabId={activeTabId}
            projectPathsById={projectPathsById}
            showTerminals={showTerminals}
            tabs={tabs}
            terminalFontSize={terminalFontSize}
          />
        </Suspense>
      )}
      {view === "settings" && <SettingsView />}
      {view === "project-settings" && <ProjectSettingsView />}
    </div>
  );
}
