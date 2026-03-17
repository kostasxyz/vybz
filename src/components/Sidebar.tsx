import { open } from "@tauri-apps/plugin-dialog";
import { useApp } from "../context";

export function Sidebar() {
  const { state, dispatch } = useApp();

  async function addProject() {
    const path = await open({ directory: true });
    if (path) {
      const name = path.split("/").pop() || path;
      const id = crypto.randomUUID();
      dispatch({ type: "ADD_PROJECT", project: { id, path, name } });
      dispatch({ type: "SET_ACTIVE_PROJECT", id });
    }
  }

  function selectProject(id: string) {
    dispatch({ type: "SET_ACTIVE_PROJECT", id });
  }

  function removeProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: "REMOVE_PROJECT", id });
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>Projects</span>
        <button className="add-btn" onClick={addProject}>
          +
        </button>
      </div>
      <div className="project-list">
        {state.projects.map((project) => (
          <div
            key={project.id}
            className={`project-item ${state.activeProjectId === project.id ? "active" : ""}`}
            onClick={() => selectProject(project.id)}
          >
            <span className="project-name" title={project.path}>
              {project.name}
            </span>
            <button
              className="remove-btn"
              onClick={(e) => removeProject(project.id, e)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
