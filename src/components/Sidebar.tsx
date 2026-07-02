import { useState, useRef, useEffect, type CSSProperties } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppDispatch, useAppSelector } from "../context";
import { PROJECT_COLORS } from "../types";
import { ProjectColorPicker } from "./ProjectColorPicker";

export function Sidebar() {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.projects);
  const activeProjectId = useAppSelector((state) => state.activeProjectId);
  const view = useAppSelector((state) => state.view);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; below: boolean } | null>(
    null,
  );
  const editInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const projectListRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const dropTargetRef = useRef<typeof dropTarget>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (!colorPickerId) return;
    function handleClick(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [colorPickerId]);

  async function addProject() {
    const path = await open({ directory: true });
    if (path) {
      const name = path.split("/").pop() || path;
      const id = crypto.randomUUID();
      const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
      dispatch({ type: "ADD_PROJECT", project: { id, path, name, color } });
      dispatch({ type: "SET_ACTIVE_PROJECT", id });
    }
  }

  function selectProject(id: string) {
    if (view !== "terminals") {
      dispatch({ type: "SET_VIEW", view: "terminals" });
    }
    dispatch({ type: "SET_ACTIVE_PROJECT", id });
  }

  function removeProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: "REMOVE_PROJECT", id });
  }

  function startRename(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(name);
  }

  function commitRename() {
    if (editingId && editValue.trim()) {
      dispatch({ type: "RENAME_PROJECT", id: editingId, name: editValue.trim() });
    }
    setEditingId(null);
  }

  function moveProject(fromId: string, toId: string, below: boolean) {
    if (fromId === toId) return;
    const fromIndex = projects.findIndex((p) => p.id === fromId);
    if (fromIndex === -1) return;

    const next = [...projects];
    const [moved] = next.splice(fromIndex, 1);
    let toIndex = next.findIndex((p) => p.id === toId);
    if (toIndex === -1) return;
    if (below) toIndex += 1;
    next.splice(toIndex, 0, moved);

    if (next.every((p, i) => p.id === projects[i].id)) return;
    dispatch({ type: "SET_PROJECTS", projects: next });
  }

  function getDropTarget(clientY: number, draggedId: string) {
    const list = projectListRef.current;
    if (!list) return null;

    const items = Array.from(
      list.querySelectorAll<HTMLElement>("[data-project-id]"),
    )
      .map((element) => ({
        element,
        id: element.dataset.projectId,
        rect: element.getBoundingClientRect(),
      }))
      .filter((item): item is {
        element: HTMLElement;
        id: string;
        rect: DOMRect;
      } => Boolean(item.id) && item.id !== draggedId);

    if (items.length === 0) return null;

    for (const item of items) {
      if (clientY >= item.rect.top && clientY <= item.rect.bottom) {
        return {
          id: item.id,
          below: clientY > item.rect.top + item.rect.height / 2,
        };
      }
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (clientY < first.rect.top) {
      return { id: first.id, below: false };
    }

    if (clientY > last.rect.bottom) {
      return { id: last.id, below: true };
    }

    return null;
  }

  function updateDropTarget(nextTarget: typeof dropTarget) {
    dropTargetRef.current = nextTarget;
    setDropTarget((prev) =>
      prev?.id === nextTarget?.id && prev?.below === nextTarget?.below
        ? prev
        : nextTarget,
    );
  }

  function resetDragState() {
    dragStateRef.current = null;
    dropTargetRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleProjectPointerDown(id: string, e: React.PointerEvent<HTMLDivElement>) {
    if (editingId === id || e.button !== 0) return;

    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest("button, input, .project-badge, .color-picker")) {
      return;
    }

    dragStateRef.current = {
      id,
      pointerId: e.pointerId,
      startY: e.clientY,
      dragging: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleProjectPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== e.pointerId) return;

    if (!dragState.dragging) {
      const distance = Math.abs(e.clientY - dragState.startY);
      if (distance < 4) return;

      dragState.dragging = true;
      setDraggingId(dragState.id);
      setColorPickerId(null);
    }

    e.preventDefault();
    updateDropTarget(getDropTarget(e.clientY, dragState.id));
  }

  function handleProjectPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== e.pointerId) return;

    const wasDragging = dragState.dragging;
    const target = dropTargetRef.current;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    resetDragState();

    if (!wasDragging) return;

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    e.preventDefault();
    e.stopPropagation();

    if (target) {
      moveProject(dragState.id, target.id, target.below);
    }
  }

  function handleProjectPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId !== e.pointerId) return;
    resetDragState();
  }

  function handleProjectClick(id: string, e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    selectProject(id);
  }

  function toggleSettings() {
    dispatch({
      type: "SET_VIEW",
      view: view === "settings" ? "terminals" : "settings",
    });
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span>Projects</span>
        <button className="add-btn" onClick={addProject}>
          +
        </button>
      </div>
      <div className="project-list" ref={projectListRef}>
        {projects.map((project) => (
          <div
            key={project.id}
            data-project-id={project.id}
            className={[
              "project-item",
              activeProjectId === project.id ? "active" : "",
              draggingId === project.id ? "dragging" : "",
              dropTarget?.id === project.id
                ? dropTarget.below
                  ? "drop-below"
                  : "drop-above"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                "--project-item-indicator-color": project.color || "#61afef",
              } as CSSProperties
            }
            onClick={(e) => handleProjectClick(project.id, e)}
            onDoubleClick={(e) => startRename(project.id, project.name, e)}
            onPointerDown={(e) => handleProjectPointerDown(project.id, e)}
            onPointerMove={handleProjectPointerMove}
            onPointerUp={handleProjectPointerUp}
            onPointerCancel={handleProjectPointerCancel}
          >
            <div className="project-item-top">
              <div className="project-badge-wrapper">
                <span
                  className="project-badge"
                  style={{ background: project.color || "#61afef" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerId(colorPickerId === project.id ? null : project.id);
                  }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </span>
                {colorPickerId === project.id && (
                  <div
                    className="color-picker"
                    ref={colorPickerRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ProjectColorPicker
                      color={project.color || "#61afef"}
                      presets={PROJECT_COLORS}
                      onChange={(color) => {
                        dispatch({ type: "SET_PROJECT_COLOR", id: project.id, color });
                      }}
                      onPresetSelect={() => setColorPickerId(null)}
                    />
                  </div>
                )}
              </div>
              {editingId === project.id ? (
                <input
                  ref={editInputRef}
                  className="project-rename-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="project-name">{project.name}</span>
              )}
            </div>
            <span className="project-path" title={project.path}>
              {project.path}
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
      <div className="sidebar-footer">
        <button
          className={`settings-btn ${view === "settings" ? "active" : ""}`}
          onClick={toggleSettings}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
