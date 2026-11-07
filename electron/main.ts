import * as electron from "electron";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import heicConvert from "heic-convert";
import { translate } from "../src/i18n/messages";
import { registerPluginIpc } from "./plugins/ipc";
import { cleanupPluginStaging } from "./plugins/state";
import { compareVersions } from "./plugins/version";
import { markitdownComponentPath, registerComponentIpc } from "./components";

if (process.env.BENNETT_USER_DATA_DIR) {
  electron.app.setPath("userData", process.env.BENNETT_USER_DATA_DIR);
}

const hasSingleInstanceLock = electron.app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  electron.app.quit();
}

if (process.env.E2E_DISABLE_GPU === "1") {
  electron.app.disableHardwareAcceleration();
  electron.app.commandLine.appendSwitch("disable-gpu");
}

const UPDATE_REPO = "bennett-0727/bennett-toolbox";

async function checkForUpdates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=20`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Bennett-Toolbox",
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const releases = (await response.json()) as Array<{
      tag_name?: string;
      html_url?: string;
      name?: string;
      published_at?: string;
      draft?: boolean;
      prerelease?: boolean;
    }>;
    const candidates = releases
      .filter(
        (release) =>
          !release.draft &&
          !release.prerelease &&
          typeof release.tag_name === "string" &&
          /^v\d+\.\d+\.\d+$/.test(release.tag_name),
      )
      .sort((a, b) => compareVersions(b.tag_name || "", a.tag_name || ""));
    const latest = candidates[0];
    const currentVersion = electron.app.getVersion();
    if (!latest) {
      return { currentVersion, latestVersion: currentVersion, hasUpdate: false, url: "" };
    }
    const latestVersion = (latest.tag_name || "").replace(/^v/, "");
    return {
      currentVersion,
      latestVersion,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      url: latest.html_url || `https://github.com/${UPDATE_REPO}/releases`,
      name: latest.name || latest.tag_name,
      publishedAt: latest.published_at || null,
    };
  } finally {
    clearTimeout(timer);
  }
}

electron.ipcMain.handle("check-updates", async () => checkForUpdates());
electron.ipcMain.handle("open-external", async (_event, url: unknown) => {
  if (
    typeof url === "string" &&
    url.startsWith(`https://github.com/${UPDATE_REPO}`)
  ) {
    await electron.shell.openExternal(url);
  }
});

let language: "zh-CN" | "en-US" = "zh-CN";
const tr = (text: string) => translate(language, text);

const MARKITDOWN_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "html", "htm", "txt", "csv", "json", "xml", "zip", "epub", "jpg", "jpeg", "png", "gif", "webp", "wav", "mp3"];
const markitdownBinaryName = Q => Q === "win32" ? "markitdown.exe" : "markitdown";
const joinSegments = (...Q) => Q.map((D, o) => o === 0 ? D.replace(/\/+$/, "") : D.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
const getMarkitdownCandidates = Q => {
  const D = markitdownBinaryName(Q.platform);
  return [Q.resourcesPath ? joinSegments(Q.resourcesPath, "markitdown", D) : null, joinSegments(Q.appPath, "vendor", "markitdown", D), joinSegments(Q.cwd, "vendor", "markitdown", D)].filter(s => s);
};
const findMarkitdownCommands = Q => {
  const D = [];
  if (Q.env.MARKITDOWN_BIN) {
    D.push({
      command: Q.env.MARKITDOWN_BIN,
      argsPrefix: [],
      label: "MARKITDOWN_BIN"
    });
  }
  for (const o of getMarkitdownCandidates(Q)) {
    if (Q.existsSync(o)) {
      D.push({
        command: o,
        argsPrefix: [],
        label: tr("内置 MarkItDown")
      });
    }
  }
  const component = markitdownComponentPath();
  if (component) {
    D.unshift({
      command: component,
      argsPrefix: [],
      label: tr("文档转换组件")
    });
  }
  return D.filter((o, s, N) => N.findIndex(a => a.command === o.command && a.argsPrefix.join(" ") === o.argsPrefix.join(" ")) === s);
};
const sanitizeMarkitdownError = Q => Q.split(/\r?\n/).map(o => o.trimEnd()).filter(o => {
  const s = o.trim();
  return !!s && !s.startsWith("Traceback") && !s.startsWith("[PYI-") && !/^File ".*", line \d+/.test(s) && (!s.includes("pydub/utils.py") || !s.includes("RuntimeWarning"));
}).map(o => o.replace(/^markitdown\._exceptions\.FileConversionException:\s*/, "")).join(`
`) || tr("MarkItDown 转换失败");
const floatingWindows = new Map();
let mainWindow = null;
let selectionWindow = null;
let isQuitting = false;
const closeSecondaryWindows = () => {
  if (selectionWindow && !selectionWindow.isDestroyed()) {
    selectionWindow.close();
  }
  selectionWindow = null;
  for (const Q of floatingWindows.values()) {
    if (!Q.isDestroyed()) {
      Q.close();
    }
  }
  floatingWindows.clear();
};
const runMarkitdown = (Q, D) => new Promise((o, s) => {
  const env = { ...process.env };
  const internal = path.join(path.dirname(Q.command), "_internal");
  if (process.platform === "darwin" && fs.existsSync(internal)) {
    env.DYLD_LIBRARY_PATH = env.DYLD_LIBRARY_PATH
      ? `${internal}:${env.DYLD_LIBRARY_PATH}`
      : internal;
  }
  const N = childProcess.spawn(Q.command, [...Q.argsPrefix, D], {
    windowsHide: true,
    env
  });
  let a = "";
  let R = "";
  let U = false;
  const M = setTimeout(() => {
    if (!U) {
      U = true;
      N.kill();
      s(new Error(tr("转换超时，请确认文件大小或 MarkItDown 安装状态")));
    }
  }, 120000);
  N.stdout.on("data", L => {
    a += L.toString();
  });
  N.stderr.on("data", L => {
    R += L.toString();
  });
  N.on("error", L => {
    if (!U) {
      U = true;
      clearTimeout(M);
      s(L);
    }
  });
  N.on("close", L => {
    if (!U) {
      U = true;
      clearTimeout(M);
      if (L === 0) {
        o(a);
        return;
      }
      s(new Error(R.trim() || tr(`MarkItDown 退出码：${L}`)));
    }
  });
});
const convertHeicWithSips = (Q: string, D: string) => new Promise<{ dataUrl: string; size: number }>((o, s) => {
  if (process.platform !== "darwin") {
    s(new Error(tr("HEIC 转换当前仅支持 macOS")));
    return;
  }
  const N = D === "jpg" ? "jpg" : "png";
  const a = D === "jpg" ? "jpeg" : "png";
  const R = path.join(electron.app.getPath("temp"), `bennett-heic-${Date.now()}-${Math.random().toString(16).slice(2)}.${N}`);
  const U = childProcess.spawn("sips", ["-s", "format", a, Q, "--out", R], {
    windowsHide: true
  });
  let M = "";
  let L = false;
  const e = () => {
    fs.promises.unlink(R).catch(() => {});
  };
  const J = setTimeout(() => {
    if (!L) {
      L = true;
      U.kill();
      e();
      s(new Error(tr("HEIC 转换超时")));
    }
  }, 60000);
  U.stderr.on("data", f => {
    M += f.toString();
  });
  U.on("error", f => {
    if (!L) {
      L = true;
      clearTimeout(J);
      e();
      s(f);
    }
  });
  U.on("close", async f => {
    if (!L) {
      L = true;
      clearTimeout(J);
      if (f !== 0) {
        e();
        s(new Error(M.trim() || tr(`sips 退出码：${f}`)));
        return;
      }
      try {
        const [P, iA] = await Promise.all([fs.promises.readFile(R), fs.promises.stat(R)]);
        e();
        o({
          dataUrl: `data:${D === "jpg" ? "image/jpeg" : "image/png"};base64,${P.toString("base64")}`,
          size: iA.size
        });
      } catch (P) {
        e();
        s(P);
      }
    }
  });
});
const convertHeicWithLib = async (Q: string, D: string): Promise<{ dataUrl: string; size: number }> => {
  const o = await fs.promises.readFile(Q);
  const s = D === "jpg" ? "JPEG" : "PNG";
  const N = Buffer.from(await heicConvert({
    buffer: o,
    format: s,
    quality: 0.92
  }));
  return {
    dataUrl: `data:${D === "jpg" ? "image/jpeg" : "image/png"};base64,${N.toString("base64")}`,
    size: N.length
  };
};
const convertHeicImage = (Q, D) => process.platform === "darwin" ? convertHeicWithSips(Q, D) : convertHeicWithLib(Q, D);
const convertFileToMarkdown = async Q => {
  const D = findMarkitdownCommands({
    appPath: electron.app.getAppPath(),
    cwd: process.cwd(),
    env: process.env,
    existsSync: fs.existsSync,
    platform: process.platform,
    resourcesPath: process.resourcesPath
  });
  if (D.length === 0) {
    return {
      success: false,
      error: tr("应用未找到随包 MarkItDown。请先运行 npm run setup:markitdown 生成内置转换器，再重新启动应用。"),
      sourcePath: Q,
      sourceName: path.basename(Q)
    };
  }
  let o = tr("MarkItDown 转换失败");
  for (const s of D) {
    try {
      return {
        success: true,
        markdown: await runMarkitdown(s, Q),
        command: s.label,
        sourcePath: Q,
        sourceName: path.basename(Q)
      };
    } catch (N) {
      o = N instanceof Error ? N.message : String(N);
    }
  }
  return {
    success: false,
    error: tr(`MarkItDown 转换失败：
${sanitizeMarkitdownError(o)}`),
    sourcePath: Q,
    sourceName: path.basename(Q)
  };
};
electron.ipcMain.on("set-language", (_event, next) => {
  if (next === "en-US" || next === "zh-CN") language = next;
});

function createMainWindow() {
  const Q = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f23",
    show: false
  });
  mainWindow = Q;
  Q.once("ready-to-show", () => {
    Q.show();
  });
  Q.on("closed", () => {
    if (mainWindow === Q) mainWindow = null;
  });
  Q.on("close", () => {
    if (process.platform !== "darwin") {
      if (!isQuitting) {
        isQuitting = true;
        closeSecondaryWindows();
      }
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    Q.loadURL(process.env.VITE_DEV_SERVER_URL);
    Q.webContents.openDevTools();
  } else {
    Q.loadFile(path.join(electron.app.getAppPath(), "dist/index.html"));
  }
}
electron.ipcMain.handle("select-directory", async (Q, D) => {
  const o = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"],
    defaultPath: D
  });
  if (o.canceled) {
    return null;
  } else {
    return o.filePaths[0];
  }
});
electron.ipcMain.handle("select-markitdown-file", async () => {
  const Q = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{
      name: tr("MarkItDown 支持的文件"),
      extensions: MARKITDOWN_EXTENSIONS
    }, {
      name: tr("所有文件"),
      extensions: ["*"]
    }]
  });
  if (Q.canceled || !Q.filePaths[0]) {
    return null;
  }
  const D = Q.filePaths[0];
  const o = fs.statSync(D);
  return {
    path: D,
    name: path.basename(D),
    size: o.size,
    extension: path.extname(D).slice(1).toUpperCase() || "FILE"
  };
});
electron.ipcMain.handle("convert-file-to-markdown", async (Q, D) => !D || !fs.existsSync(D) ? {
  success: false,
  error: tr("文件不存在或路径无效")
} : convertFileToMarkdown(D));
electron.ipcMain.handle("convert-heic-image", async (Q, D) => {
  const {
    filePath: o,
    targetFormat: s
  } = D;
  if (!o || !fs.existsSync(o)) {
    return {
      success: false,
      error: tr("文件不存在或路径无效")
    };
  }
  if (!["png", "jpg"].includes(s)) {
    return {
      success: false,
      error: tr("HEIC 当前支持转换为 PNG 或 JPG")
    };
  }
  try {
    return {
      success: true,
      ...(await convertHeicImage(o, s))
    };
  } catch (N) {
    return {
      success: false,
      error: N instanceof Error ? N.message : tr("HEIC 转换失败")
    };
  }
});
electron.ipcMain.handle("check-screen-permission", async () => {
  if (process.platform !== "darwin") return "granted";
  const status = electron.systemPreferences.getMediaAccessStatus("screen");
  if (status === "granted") return status;
  try {
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1, height: 1 },
    });
    if (sources.length > 0) return "granted";
  } catch {}
  return status;
});
electron.ipcMain.handle("open-screen-permission-settings", async () => {
  if (process.platform === "darwin") {
    await electron.shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
    );
  }
});
electron.ipcMain.handle("get-desktop-sources", async () => {
  try {
    return (await electron.desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: {
        width: 320,
        height: 180
      }
    })).map(D => {
      var o;
      return {
        id: D.id,
        name: D.name,
        thumbnail: D.thumbnail.toDataURL(),
        appIcon: ((o = D.appIcon) == null ? undefined : o.toDataURL()) || null
      };
    });
  } catch (Q) {
    console.error("获取屏幕源失败:", Q);
    return [];
  }
});
electron.ipcMain.handle("copy-text-to-clipboard", async (_event, text: unknown) => {
  if (typeof text !== "string") return false;
  await electron.clipboard.writeText(text);
  return true;
});
electron.ipcMain.handle("copy-image-to-clipboard", async (_event, dataUrl: unknown) => {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
    return false;
  }
  try {
    const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
    await electron.clipboard.write([
      new electron.ClipboardItem({
        "image/png": new Blob([png], { type: "image/png" }),
      }),
    ]);
    return true;
  } catch (error) {
    console.error("复制截图失败:", error);
    return false;
  }
});
electron.ipcMain.handle("create-floating-window", async (Q, D) => {
  var f;
  const {
    id: o,
    dataUrl: s,
    width: N,
    height: a
  } = D;
  if (floatingWindows.has(o)) {
    if ((f = floatingWindows.get(o)) != null) {
      f.close();
    }
  }
  const {
    width: R,
    height: U
  } = electron.screen.getPrimaryDisplay().workAreaSize;
  const M = R - N - 50;
  const L = U - a - 50;
  const e = new electron.BrowserWindow({
    width: Math.max(N, 100),
    height: Math.max(a, 100),
    x: M,
    y: L,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  const J = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      position: relative;
      width: 100%;
      height: 100%;
      border: 2px solid rgba(80, 120, 255, 0.5);
      border-radius: 8px;
      overflow: hidden;
      background: #1a1a2e;
    }
    .titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 28px;
      padding: 0 8px;
      background: rgba(30, 30, 50, 0.95);
      cursor: move;
      -webkit-app-region: drag;
    }
    .title {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }
    .controls {
      display: flex;
      gap: 6px;
      -webkit-app-region: no-drag;
    }
    .control-btn {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .control-btn:hover { opacity: 1; }
    .close-btn { background: #ff5f56; }
    .pin-btn { background: #27c93f; }
    .pin-btn.active { background: #ffbd2e; }
    img {
      width: 100%;
      height: calc(100% - 28px);
      object-fit: contain;
      background: 
        linear-gradient(45deg, rgba(100, 100, 150, 0.1) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(100, 100, 150, 0.1) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(100, 100, 150, 0.1) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(100, 100, 150, 0.1) 75%);
      background-size: 10px 10px;
    }
    .resize-handle {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      -webkit-app-region: no-drag;
    }
    .resize-handle::after {
      content: '';
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(255,255,255,0.3);
      border-bottom: 2px solid rgba(255,255,255,0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="titlebar">
      <span class="title">${tr("悬浮截图")}</span>
      <div class="controls">
        <button class="control-btn pin-btn active" id="pinBtn" title="${tr("取消置顶")}"></button>
        <button class="control-btn close-btn" id="closeBtn" title="${tr("关闭")}"></button>
      </div>
    </div>
    <img src="${s}" draggable="false" />
    <div class="resize-handle"></div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    let isPinned = true;
    
    document.getElementById('closeBtn').addEventListener('click', () => {
      ipcRenderer.send('close-floating-window', '${o}');
    });
    
    document.getElementById('pinBtn').addEventListener('click', (e) => {
      isPinned = !isPinned;
      ipcRenderer.send('toggle-always-on-top', { id: '${o}', alwaysOnTop: isPinned });
      e.target.classList.toggle('active', isPinned);
      e.target.title = isPinned ? ${JSON.stringify(tr("取消置顶"))} : ${JSON.stringify(tr("置顶"))};
    });
  <\/script>
</body>
</html>
    `;
  e.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(J)}`);
  floatingWindows.set(o, e);
  e.on("closed", () => {
    floatingWindows.delete(o);
  });
  return true;
});
electron.ipcMain.on("close-floating-window", (Q, D) => {
  const o = floatingWindows.get(D);
  if (o) {
    o.close();
    floatingWindows.delete(D);
  }
});
electron.ipcMain.on("toggle-always-on-top", (Q, D) => {
  const o = floatingWindows.get(D.id);
  if (o) {
    o.setAlwaysOnTop(D.alwaysOnTop);
  }
});
electron.ipcMain.handle("start-capture-selection", async () => {
  try {
    const Q = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: electron.screen.getPrimaryDisplay().size
    });
    if (Q.length === 0) {
      return {
        success: false,
        error: tr("无法获取屏幕")
      };
    }
    const D = Q[0];
    const o = electron.screen.getPrimaryDisplay().bounds;
    const s = D.thumbnail.toDataURL();
    selectionWindow = new electron.BrowserWindow({
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreen: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    const N = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      overflow: hidden;
      cursor: crosshair;
      user-select: none;
    }
    .screenshot-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: url('${s}');
      background-size: cover;
      filter: brightness(0.5);
    }
    .selection {
      position: fixed;
      border: 2px solid #5078ff;
      background: transparent;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      display: none;
    }
    .selection.active {
      display: block;
    }
    .selection-preview {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${s}');
      background-size: ${o.width}px ${o.height}px;
    }
    .size-label {
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 10px;
      background: #5078ff;
      color: white;
      font-size: 12px;
      font-family: monospace;
      border-radius: 4px;
      white-space: nowrap;
    }
    .hint {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 14px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
  </style>
</head>
<body>
  <div class="screenshot-bg"></div>
  <div class="selection" id="selection">
    <div class="selection-preview" id="preview"></div>
    <div class="size-label" id="sizeLabel">0 × 0</div>
  </div>
  <div class="hint">${tr("拖拽选择截图区域，ESC 取消")}</div>
  
  <script>
    const { ipcRenderer } = require('electron');
    const selection = document.getElementById('selection');
    const preview = document.getElementById('preview');
    const sizeLabel = document.getElementById('sizeLabel');
    
    let isSelecting = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    
    document.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      selection.classList.add('active');
      updateSelection();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;
      currentX = e.clientX;
      currentY = e.clientY;
      updateSelection();
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isSelecting) return;
      isSelecting = false;
      
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      if (width > 10 && height > 10) {
        ipcRenderer.send('capture-selection-complete', { x, y, width, height });
      } else {
        ipcRenderer.send('capture-selection-cancel');
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('capture-selection-cancel');
      }
    });
    
    function updateSelection() {
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      selection.style.left = x + 'px';
      selection.style.top = y + 'px';
      selection.style.width = width + 'px';
      selection.style.height = height + 'px';
      
      preview.style.backgroundPosition = -x + 'px ' + -y + 'px';
      sizeLabel.textContent = width + ' × ' + height;
    }
  <\/script>
</body>
</html>
    `;
    selectionWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(N)}`);
    return {
      success: true,
      screenshotDataUrl: s
    };
  } catch (Q) {
    console.error("框选截图失败:", Q);
    return {
      success: false,
      error: Q.message
    };
  }
});
electron.ipcMain.on("capture-selection-complete", async (Q, D) => {
  if (selectionWindow) {
    selectionWindow.close();
    selectionWindow = null;
  }
  try {
    const o = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: electron.screen.getPrimaryDisplay().size
    });
    if (o.length > 0) {
      const a = o[0].thumbnail.crop(D).toDataURL();
      const floatingWindowSet = new Set(floatingWindows.values());
      const U = electron.BrowserWindow.getAllWindows().find(M => !floatingWindowSet.has(M));
      if (U) {
        U.webContents.send("capture-result", {
          success: true,
          dataUrl: a,
          width: D.width,
          height: D.height
        });
      }
    }
  } catch (o) {
    console.error("裁剪截图失败:", o);
  }
});
electron.ipcMain.on("capture-selection-cancel", () => {
  if (selectionWindow) {
    selectionWindow.close();
    selectionWindow = null;
  }
});
registerPluginIpc();
registerComponentIpc();

if (hasSingleInstanceLock) {
  electron.app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  electron.app.whenReady().then(() => {
    cleanupPluginStaging();
    createMainWindow();
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}
electron.app.on("before-quit", () => {
  isQuitting = true;
  closeSecondaryWindows();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
