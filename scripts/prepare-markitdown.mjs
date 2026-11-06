import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const PLATFORM = process.env.MATRIX_PLATFORM || (process.platform === "darwin" ? "mac" : "win");
const ARCH = process.env.MATRIX_ARCH || process.arch;
const DEST_DIR = path.join(ROOT, "vendor/markitdown");
const BINARY = PLATFORM === "win" ? "markitdown.exe" : "markitdown";
const DEST = path.join(DEST_DIR, BINARY);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
  }
}

fs.mkdirSync(DEST_DIR, { recursive: true });

if (fs.existsSync(DEST)) {
  console.log(`MarkItDown already present: ${DEST}`);
  process.exit(0);
}

if (PLATFORM === "mac" && ARCH === "arm64") {
  console.log("Downloading prebuilt macOS arm64 MarkItDown from release asset...");
  run("gh", [
    "release",
    "download",
    "markitdown-binaries",
    "--pattern",
    "markitdown-darwin-arm64",
    "--dir",
    DEST_DIR,
    "--clobber",
  ]);
  fs.renameSync(path.join(DEST_DIR, "markitdown-darwin-arm64"), DEST);
} else {
  const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  console.log(`Building MarkItDown with PyInstaller for ${PLATFORM}/${ARCH}...`);
  run(python, ["-m", "pip", "install", "--upgrade", "pip"]);
  run(python, ["-m", "pip", "install", "markitdown[all]", "pyinstaller"]);
  const buildDir = path.join(ROOT, ".markitdown-build");
  run(python, [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--name",
    "markitdown",
    "--distpath",
    path.join(buildDir, "dist"),
    "--workpath",
    path.join(buildDir, "work"),
    "--specpath",
    buildDir,
    "--collect-all",
    "markitdown",
    "--collect-all",
    "magika",
    path.join(ROOT, "scripts/markitdown_entry.py"),
  ]);
  fs.copyFileSync(path.join(buildDir, "dist", BINARY), DEST);
}

try {
  fs.chmodSync(DEST, 0o755);
} catch {}

console.log(`MarkItDown ready: ${DEST}`);
