import { useState } from "react";
import { useApp } from "../context";
import { ProjectCommand } from "../types";

export function ProjectSettingsView() {
  const { state, dispatch } = useApp();
  const project = state.projects.find((p) => p.id === state.activeProjectId);
  const [newName, setNewName] = useState("");
  const [newCmd, setNewCmd] = useState("");

  if (!project) {
    return (
      <div className="settings-view">
        <p style={{ color: "#666" }}>Select a project first</p>
      </div>
    );
  }

  const commands = project.commands ?? [];

  function addCommand() {
    if (!newName.trim() || !newCmd.trim() || !project) return;
    const cmd: ProjectCommand = {
      id: `cmd-${Date.now()}`,
      name: newName.trim(),
      command: newCmd.trim(),
    };
    dispatch({
      type: "SET_PROJECT_COMMANDS",
      id: project.id,
      commands: [...commands, cmd],
    });
    setNewName("");
    setNewCmd("");
  }

  function removeCommand(cmdId: string) {
    if (!project) return;
    dispatch({
      type: "SET_PROJECT_COMMANDS",
      id: project.id,
      commands: commands.filter((c) => c.id !== cmdId),
    });
  }

  return (
    <div className="settings-view">
      <h2 className="settings-title">Project Settings — {project.name}</h2>

      <div className="settings-section">
        <h3 className="settings-section-title">Commands</h3>

        {commands.length > 0 && (
          <div className="command-list">
            {commands.map((cmd) => (
              <div key={cmd.id} className="command-row">
                <div className="command-info">
                  <span className="command-name">{cmd.name}</span>
                  <span className="command-value">{cmd.command}</span>
                </div>
                <button
                  className="command-remove"
                  onClick={() => removeCommand(cmd.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="command-add">
          <input
            className="command-input"
            placeholder="Label (e.g. Dev Server)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCommand()}
          />
          <input
            className="command-input command-input-wide"
            placeholder="Command (e.g. npm run dev)"
            value={newCmd}
            onChange={(e) => setNewCmd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCommand()}
          />
          <button
            className="command-add-btn"
            onClick={addCommand}
            disabled={!newName.trim() || !newCmd.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
