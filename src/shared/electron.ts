const electron =
  typeof window !== "undefined" && typeof window.require === "function"
    ? window.require("electron")
    : null;

export function getFilePath(file: File): string {
  try {
    const path = electron?.webUtils?.getPathForFile?.(file);
    if (path) return path;
  } catch {}
  return (file as File & { path?: string }).path ?? "";
}

export async function copyText(text: string): Promise<void> {
  if (electron?.ipcRenderer) {
    await electron.ipcRenderer.invoke("copy-text-to-clipboard", text);
    return;
  }
  await navigator.clipboard.writeText(text);
}