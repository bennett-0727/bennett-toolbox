import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const platform = process.env.MATRIX_PLATFORM;
const arch = process.env.MATRIX_ARCH;
if (!platform || !arch) throw new Error("MATRIX_PLATFORM / MATRIX_ARCH required");

const ext = platform === "win" ? ".exe" : "";
const source = path.join(ROOT, "vendor/markitdown", `markitdown${ext}`);
if (!fs.existsSync(source)) throw new Error(`Missing MarkItDown binary: ${source}`);

const targetName = `markitdown-${platform === "win" ? "win32" : "darwin"}-${arch}${ext}`;
const releaseDir = path.join(ROOT, "release");
fs.mkdirSync(releaseDir, { recursive: true });
const target = path.join(releaseDir, targetName);
fs.copyFileSync(source, target);
const hash = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
fs.writeFileSync(`${target}.sha256`, `${hash}  ${targetName}\n`);
console.log(`component asset: ${targetName} (${fs.statSync(target).size} bytes)`);
