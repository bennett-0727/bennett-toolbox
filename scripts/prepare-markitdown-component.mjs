import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";

const ROOT = path.resolve(import.meta.dirname, "..");
const platform = process.env.MATRIX_PLATFORM;
const arch = process.env.MATRIX_ARCH;
if (!platform || !arch) throw new Error("MATRIX_PLATFORM / MATRIX_ARCH required");

const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const buildDir = path.join(ROOT, ".markitdown-component");
const distDir = path.join(buildDir, "dist");
const binaryName = platform === "win" ? "markitdown.exe" : "markitdown";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

run(python, ["-m", "pip", "install", "--upgrade", "pip"]);
run(python, ["-m", "pip", "install", "markitdown[all]", "pyinstaller", "cryptography==46.0.3"]);
run(python, [
  "-m",
  "PyInstaller",
  "--noconfirm",
  "--clean",
  "--onedir",
  "--name",
  "markitdown",
  "--distpath",
  distDir,
  "--workpath",
  path.join(buildDir, "work"),
  "--specpath",
  buildDir,
  "--collect-all",
  "markitdown",
  "--collect-all",
  "magika",
  "--collect-all",
  "pdfminer",
  "--collect-all",
  "pdfplumber",
  "--collect-all",
  "pypdfium2",
  "--hidden-import",
  "pdfminer.high_level",
  "--hidden-import",
  "pdfminer.layout",
  path.join(ROOT, "scripts/markitdown_entry.py"),
]);

const sourceDir = path.join(distDir, "markitdown");
const binary = path.join(sourceDir, binaryName);
if (!fs.existsSync(binary)) throw new Error(`Missing component binary: ${binary}`);

const zip = new JSZip();
function addDirectory(directory, prefix = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) addDirectory(full, name);
    else if (fs.statSync(full).isFile()) zip.file(name, fs.readFileSync(full));
  }
}
addDirectory(sourceDir);

const targetName = `markitdown-${platform === "win" ? "win32" : "darwin"}-${arch}.zip`;
const releaseDir = path.join(ROOT, "release");
fs.mkdirSync(releaseDir, { recursive: true });
const target = path.join(releaseDir, targetName);
const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(target, buffer);
const hash = crypto.createHash("sha256").update(buffer).digest("hex");
fs.writeFileSync(`${target}.sha256`, `${hash}  ${targetName}\n`);
console.log(`component asset: ${targetName} (${buffer.byteLength} bytes)`);
