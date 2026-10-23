import { createWorkspace, validateWorkspace, type Workspace } from "./model";

export const STORAGE_KEY = "elsewhere.workspace.v1";

export function loadWorkspace(): {
  workspace: Workspace;
  warning: string | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: createWorkspace(), warning: null };
    return { workspace: validateWorkspace(JSON.parse(raw)), warning: null };
  } catch {
    return {
      workspace: createWorkspace(),
      warning:
        "Your saved plans could not be read. We haven’t overwritten them. Download your recovery file before saving new plans.",
    };
  }
}

export function saveWorkspace(workspace: Workspace): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return true;
  } catch {
    return false;
  }
}

export function downloadFile(
  contents: string,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "elsewhere-plan"
  );
}
