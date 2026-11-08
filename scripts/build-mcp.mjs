import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import JSZip from "jszip";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "dist-mcp");
const version = process.env.MCP_VERSION || "0.2.0";
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid MCP_VERSION: ${version}`);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const bundleName = `bennett-mcp-${version}.mjs`;
const bundlePath = path.join(OUT, bundleName);
const zipName = `bennett-mcp-${version}.zip`;
const zipPath = path.join(OUT, zipName);

await build({
  entryPoints: [path.join(ROOT, "mcp/server.mjs")],
  outfile: bundlePath,
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node24"],
  external: ["sharp"],
  define: {
    "process.env.BENNETT_MCP_VERSION": JSON.stringify(version),
  },
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

const bundle = fs.readFileSync(bundlePath);
const packageJson = {
  name: "bennett-toolbox-mcp",
  version,
  private: true,
  type: "module",
  description: "Bennett Toolbox MCP stdio server",
  engines: { node: ">=24.8.0" },
  scripts: { start: "node server.mjs" },
  dependencies: { sharp: "^0.35.5" },
};
const readme = fs.readFileSync(path.join(ROOT, "docs/mcp.md"), "utf8");
const zip = new JSZip();
zip.file("server.mjs", bundle);
zip.file("package.json", JSON.stringify(packageJson, null, 2));
zip.file("README.md", readme);
const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(zipPath, zipBuffer);

function writeChecksum(file) {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const checksumFile = `${file}.sha256`;
  fs.writeFileSync(checksumFile, `${digest}  ${path.basename(file)}\n`);
}

writeChecksum(bundlePath);
writeChecksum(zipPath);

console.log(`built ${bundleName} (${bundle.byteLength} bytes)`);
console.log(`built ${zipName} (${zipBuffer.byteLength} bytes)`);
console.log(`version ${version}, sharp is external (use ZIP install for image tools)`);
