import { useState, useEffect } from "react";
import { useApp } from "../context";
import { TerminalView } from "./TerminalView";

export function MainArea() {
  const { state } = useApp();
  const [spawnedIds, setSpawnedIds] = useState<Set<string>>(new Set());

  // Spawn terminal when a project becomes active for the first time
  useEffect(() => {
    if (state.activeProjectId && !spawnedIds.has(state.activeProjectId)) {
      setSpawnedIds((prev) => new Set([...prev, state.activeProjectId!]));
    }
  }, [state.activeProjectId]);

  // Remove spawned IDs for deleted projects
  useEffect(() => {
    const projectIds = new Set(state.projects.map((p) => p.id));
    setSpawnedIds((prev) => {
      const next = new Set([...prev].filter((id) => projectIds.has(id)));
      return next.size !== prev.size ? next : prev;
    });
  }, [state.projects]);

  const spawnedProjects = state.projects.filter((p) => spawnedIds.has(p.id));

  if (spawnedProjects.length === 0) {
    return (
      <div className="main-area">
        <div className="empty-state">
          <p>Add a project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-area">
      {spawnedProjects.map((project) => (
        <TerminalView
          key={project.id}
          cwd={project.path}
          active={state.activeProjectId === project.id}
        />
      ))}
    </div>
  );
}
