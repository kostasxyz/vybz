import { load } from "@tauri-apps/plugin-store";
import { Project } from "./types";

const STORE_FILE = "projects.json";

export async function loadProjects(): Promise<Project[]> {
  const store = await load(STORE_FILE);
  const projects = await store.get<Project[]>("projects");
  return projects ?? [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("projects", projects);
  await store.save();
}
