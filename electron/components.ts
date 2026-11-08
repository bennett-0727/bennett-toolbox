import * as crypto from "crypto";
import { spawn } from "child_process";
import * as electron from "electron";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ALLOWED_DOWNLOAD_HOSTS } from "./plugins/constants";
import { extractPluginZip } from "./plugins/archive";
import { broadcast, isTrustedSender } from "./ipc-utils";

export interface MarkitdownStatus {
  installed: boolean;
  available: boolean;
  version: string;
  path: string | null;
  assetName: string;
  platform: string;
  arch: string;
}

const REPO = "bennett-0727/bennett-toolbox";
const MAX_BYTES = 300 * 1024 * 1024;

function binaryName(): string {
  return process.platform === "win32" ? "markitdown.exe" : "markitdown";
}

function assetName(): string {
  return `markitdown-${process.platform}-${process.arch}.zip`;
}

function componentDir(version = electron.app.getVersion()): string {
  return path.join(electron.app.getPath("userData"), "components", "markitdown", version);
}

function componentBinary(version = electron.app.getVersion()): string {
  return path.join(componentDir(version), binaryName());
}

export function markitdownComponentPath(): string | null {
  try {
    const binary = componentBinary();
    return fs.existsSync(binary) ? binary : null;
  } catch {
    return null;
  }
}

function existingMarkitdown(): string | null {
  const env = process.env.MARKITDOWN_BIN;
  if (env && fs.existsSync(env)) return env;
  const component = markitdownComponentPath();
  if (component) return component;
  const binary = path.basename(componentBinary());
  const legacy = path.join(process.resourcesPath || "", "markitdown", binary);
  return fs.existsSync(legacy) ? legacy : null;
}

export async function getMarkitdownStatus(): Promise<MarkitdownStatus> {
  const component = markitdownComponentPath();
  const available = existingMarkitdown();
  return {
    installed: Boolean(component),
    available: Boolean(available),
    version: electron.app.getVersion(),
    path: available,
    assetName: assetName(),
    platform: process.platform,
    arch: process.arch,
  };
}

interface FetchBufferOptions {
  maxBytes: number;
  timeoutMs: number;
  onProgress?: (percent: number) => void;
}

async function fetchBuffer(url: string, options: FetchBufferOptions): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Bennett-Toolbox" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`);
    const host = new URL(response.url).hostname;
    const localTest =
      Boolean(process.env.BENNETT_MARKITDOWN_COMPONENT_BASE_URL) &&
      (host === "127.0.0.1" || host === "localhost");
    if (!localTest && !ALLOWED_DOWNLOAD_HOSTS.has(host)) {
      throw new Error("组件下载地址不在允许范围");
    }
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > options.maxBytes) throw new Error("组件超过大小限制");
    if (!response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > options.maxBytes) throw new Error("组件超过大小限制");
      options.onProgress?.(100);
      return buffer;
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let received = 0;
    let lastPercent = -1;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > options.maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("组件超过大小限制");
      }
      chunks.push(Buffer.from(value));
      if (declared > 0) {
        const percent = Math.min(100, Math.floor((received / declared) * 100));
        if (percent !== lastPercent) {
          lastPercent = percent;
          options.onProgress?.(percent);
        }
      }
    }
    return Buffer.concat(chunks, received);
  } catch (error) {
    if (controller.signal.aborted) throw new Error("下载超时，请检查网络后重试");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function downloadMarkitdownComponent(): Promise<MarkitdownStatus> {
  const version = electron.app.getVersion();
  const name = assetName();
  const base =
    process.env.BENNETT_MARKITDOWN_COMPONENT_BASE_URL ||
    `https://github.com/${REPO}/releases/download/v${version}`;
  broadcast("components:markitdown-progress", { percent: 5 });
  const shaText = (
    await fetchBuffer(`${base}/${name}.sha256`, { maxBytes: 4096, timeoutMs: 120000 })
  ).toString("utf8");
  const expected = shaText.trim().split(/\s+/)[0].toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error("组件校验文件无效");

  broadcast("components:markitdown-progress", { percent: 20 });
  const buffer = await fetchBuffer(`${base}/${name}`, {
    maxBytes: MAX_BYTES,
    timeoutMs: 600000,
    onProgress: (percent) => {
      broadcast("components:markitdown-progress", {
        percent: 20 + Math.round((percent / 100) * 60),
      });
    },
  });
  broadcast("components:markitdown-progress", { percent: 80 });
  const actual = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actual !== expected) throw new Error("组件 SHA-256 校验失败");

  broadcast("components:markitdown-progress", { percent: 85 });
  const dir = componentDir(version);
  const staging = `${dir}.staging-${process.pid}-${Date.now()}`;
  const previous = `${dir}.previous-${process.pid}-${Date.now()}`;
  await fs.promises.mkdir(path.dirname(dir), { recursive: true });
  await fs.promises.rm(staging, { recursive: true, force: true });
  await fs.promises.mkdir(staging, { recursive: true });
  let hadPrevious = false;
  try {
    await extractPluginZip(buffer, staging, {
      maxEntries: 5000,
      maxBytes: 500 * 1024 * 1024,
    });
    const stagedBinary = path.join(staging, binaryName());
    if (!fs.existsSync(stagedBinary)) throw new Error("组件压缩包缺少可执行文件");
    if (process.platform !== "win32") await fs.promises.chmod(stagedBinary, 0o755);
    await fs.promises.writeFile(
      path.join(staging, "component.json"),
      JSON.stringify({ name, version, sha256: actual, installedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    if (fs.existsSync(dir)) {
      await fs.promises.rename(dir, previous);
      hadPrevious = true;
    }
    await fs.promises.rename(staging, dir);
    if (hadPrevious) {
      await fs.promises.rm(previous, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => {});
    if (hadPrevious && !fs.existsSync(dir)) {
      await fs.promises.rename(previous, dir).catch(() => {});
    }
    throw error;
  }
  const binary = componentBinary(version);
  broadcast("components:markitdown-progress", { percent: 95 });
  if (process.env.BENNETT_SKIP_COMPONENT_WARMUP === "1") {
    broadcast("components:markitdown-progress", { percent: 100 });
    return getMarkitdownStatus();
  }
  const warmFile = path.join(os.tmpdir(), `bennett-markitdown-warm-${process.pid}.txt`);
  await fs.promises.writeFile(warmFile, "warm up\n", "utf8");
  const internal = path.join(path.dirname(binary), "_internal");
  const env = { ...process.env };
  if (process.platform === "darwin" && fs.existsSync(internal)) {
    env.DYLD_LIBRARY_PATH = env.DYLD_LIBRARY_PATH
      ? `${internal}:${env.DYLD_LIBRARY_PATH}`
      : internal;
  }
  await new Promise<void>((resolve) => {
    const child = spawn(binary, [warmFile], { stdio: "ignore", env });
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 120000);
    const finish = () => {
      clearTimeout(timer);
      void fs.promises.rm(warmFile, { force: true }).catch(() => {});
      resolve();
    };
    child.once("error", finish);
    child.once("exit", finish);
  });
  broadcast("components:markitdown-progress", { percent: 100 });
  return getMarkitdownStatus();
}

export function registerComponentIpc(): void {
  electron.ipcMain.handle("components:markitdown-status", async (event) => {
    if (!isTrustedSender(event)) return { ok: false, error: "不受信任的调用来源" };
    try {
      return { ok: true, status: await getMarkitdownStatus() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  electron.ipcMain.handle("components:markitdown-download", async (event) => {
    if (!isTrustedSender(event)) return { ok: false, error: "不受信任的调用来源" };
    try {
      return { ok: true, status: await downloadMarkitdownComponent() };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
