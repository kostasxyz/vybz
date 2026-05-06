import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
} from "react";
import { useAppDispatch, useAppSelector } from "../context";
import { ProjectCommand, Tab } from "../types";
import { TabBar } from "./TabBar";
import { SettingsView } from "./SettingsView";
import { ProjectSettingsView } from "./ProjectSettingsView";
import { ProjectEmptyState } from "./ProjectEmptyState";
import { getTerminalFontFamily } from "../terminalFonts";

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
  const terminalFontFamilyId = useAppSelector(
    (state) => state.terminalFontFamily,
  );
  const tools = useAppSelector((state) => state.tools);
  const editors = useAppSelector((state) => state.editors);
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

  const activeProjectTabs = activeProjectId
    ? tabsByProjectId.get(activeProjectId) ?? EMPTY_TABS
    : EMPTY_TABS;
  const activeProject = activeProjectId
    ? projectsById.get(activeProjectId) ?? null
    : null;

  const addTab = useCallback(
    (projectId: string, name: string, command?: string) => {
      dispatch({
        type: "ADD_TAB",
        tab: {
          id: createTabId(),
          projectId,
          label: name,
          command,
          execCommand: Boolean(command),
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

  const addToolTab = useCallback(
    (name: string, command?: string) => {
      if (!activeProjectId) {
        return;
      }

      addTab(activeProjectId, name, command);
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
  const showTerminalPanels = showTerminals && activeProjectTabs.length > 0;
  const terminalFontFamily = getTerminalFontFamily(terminalFontFamilyId).family;

  return (
    <div className="main-area">
      {showTerminals && activeProjectId && activeProject && (
        <TabBar
          activeTabId={activeTabId}
          editors={editors}
          tools={tools}
          onAddTool={addToolTab}
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
      {showTerminals && !activeProjectId && (
        <div className="empty-state">
          <p>Add a project to get started</p>
        </div>
      )}
      {showTerminals && activeProjectId && activeProjectTabs.length === 0 && (
        <ProjectEmptyState tools={tools} onPickTool={addToolTab} />
      )}
      {tabs.length > 0 && (
        <Suspense
          fallback={
            <div
              className="terminal-area"
              style={{ display: showTerminalPanels ? undefined : "none" }}
            />
          }
        >
          <TerminalPanels
            activeTabId={activeTabId}
            onCloseTab={closeTab}
            projectPathsById={projectPathsById}
            showTerminals={showTerminalPanels}
            tabs={tabs}
            terminalFontFamily={terminalFontFamily}
            terminalFontSize={terminalFontSize}
            tools={tools}
          />
        </Suspense>
      )}
      {view === "settings" && <SettingsView />}
      {view === "project-settings" && <ProjectSettingsView />}
    </div>
  );
}
