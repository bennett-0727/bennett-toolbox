import * as electron from "electron";

export function isTrustedSender(event: electron.IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url || "";
  return (
    /^file:\/\/.*\/dist\/index\.html(?:[?#]|$)/.test(url) ||
    /^http:\/\/127\.0\.0\.1:5173\//.test(url)
  );
}

export function broadcast(channel: string, payload: unknown): void {
  for (const window of electron.BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload);
  }
}
