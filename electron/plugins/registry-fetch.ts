import { ALLOWED_DOWNLOAD_HOSTS } from "./constants";
import { PluginValidationError } from "./manifest";

function assertAllowedUrl(value: string): void {
  const parsed = new URL(value);
  if (!ALLOWED_DOWNLOAD_HOSTS.has(parsed.hostname)) {
    throw new PluginValidationError("下载地址不在允许范围");
  }
}

export async function loadRegistryBuffer(url: string, maxBytes: number): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Bennett-Toolbox" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`);
    assertAllowedUrl(response.url);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > maxBytes) throw new PluginValidationError("下载文件超过大小限制");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) throw new PluginValidationError("下载文件超过大小限制");
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}
