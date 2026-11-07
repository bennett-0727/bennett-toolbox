import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";
import {
  PLUGIN_MAX_ENTRIES,
  PLUGIN_UNZIPPED_MAX_BYTES,
} from "./limits";
import { PluginValidationError } from "./manifest";

export function safeZipEntryPath(name: string): string {
  if (!name || name.includes("\0") || name.includes("\\")) {
    throw new PluginValidationError("插件包含非法路径");
  }
  if (name.startsWith("/") || /^[a-zA-Z]:/.test(name)) {
    throw new PluginValidationError("插件包含绝对路径");
  }
  const parts = name.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new PluginValidationError("插件包含路径穿越");
  }
  return parts.join("/");
}

export async function extractPluginZip(
  buffer: Buffer,
  destination: string,
  limits = {
    maxEntries: PLUGIN_MAX_ENTRIES,
    maxBytes: PLUGIN_UNZIPPED_MAX_BYTES,
  },
): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > limits.maxEntries) {
    throw new PluginValidationError("插件文件数量超过限制");
  }
  const root = path.resolve(destination);
  let total = 0;
  for (const entry of entries) {
    const relative = safeZipEntryPath(entry.name);
    const unixPermissions = (entry as unknown as { unixPermissions?: number }).unixPermissions;
    if (unixPermissions && (unixPermissions & 0o170000) === 0o120000) {
      throw new PluginValidationError("插件不允许包含符号链接");
    }
    const content = await entry.async("uint8array");
    total += content.byteLength;
    if (total > limits.maxBytes) {
      throw new PluginValidationError("插件解压后体积超过限制");
    }
    const target = path.resolve(root, relative);
    if (!target.startsWith(`${root}${path.sep}`)) {
      throw new PluginValidationError("插件包含路径穿越");
    }
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, content);
  }
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
