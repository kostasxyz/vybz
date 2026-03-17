import { load } from "@tauri-apps/plugin-store";
import { Project, Tab } from "./types";

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

export async function loadUiFontSize(): Promise<number> {
  const store = await load(STORE_FILE);
  const size = await store.get<number>("uiFontSize");
  return size ?? 14;
}

export async function saveUiFontSize(size: number): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("uiFontSize", size);
  await store.save();
}

export async function loadTerminalFontSize(): Promise<number> {
  const store = await load(STORE_FILE);
  const size = await store.get<number>("terminalFontSize");
  return size ?? 15;
}

export async function saveTerminalFontSize(size: number): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("terminalFontSize", size);
  await store.save();
}

export async function loadTabs(): Promise<Tab[]> {
  const store = await load(STORE_FILE);
  const tabs = await store.get<Tab[]>("tabs");
  return tabs ?? [];
}

export async function saveTabs(tabs: Tab[]): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("tabs", tabs);
  await store.save();
}

export async function loadActiveTabId(): Promise<string | null> {
  const store = await load(STORE_FILE);
  const id = await store.get<string | null>("activeTabId");
  return id ?? null;
}

export async function saveActiveTabId(id: string | null): Promise<void> {
  const store = await load(STORE_FILE);
  await store.set("activeTabId", id);
  await store.save();
}
