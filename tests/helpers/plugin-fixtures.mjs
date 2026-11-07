import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

function findPluginRepo() {
  const candidates = [
    process.env.PLUGIN_REPO_PATH,
    path.join(ROOT, "vendor/bennett-toolbox-plugins"),
    path.resolve(ROOT, "../bennett-toolbox-plugins"),
    path.resolve(ROOT, "../../bennett-toolbox-plugins"),
  ].filter(Boolean);
  return candidates.find(
    (candidate) =>
      fs.existsSync(path.join(candidate, "package.json")) ||
      fs.existsSync(path.join(candidate, "dist/registry.json")),
  );
}

export function preparePluginRegistry() {
  if (process.env.BENNETT_PLUGIN_REGISTRY_DIR) return process.env.BENNETT_PLUGIN_REGISTRY_DIR;

  const repo = findPluginRepo();
  if (!repo) {
    throw new Error("Plugin repository not found; set PLUGIN_REPO_PATH or BENNETT_PLUGIN_REGISTRY_DIR");
  }
  if (!fs.existsSync(path.join(repo, "dist/registry.json"))) {
    run("npm", ["ci"], repo);
    run("npm", ["run", "release"], repo);
  }
  const registry = JSON.parse(fs.readFileSync(path.join(repo, "dist/registry.json"), "utf8"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bennett-plugin-registry-"));
  fs.mkdirSync(path.join(dir, "zips"), { recursive: true });
  for (const plugin of registry.plugins) {
    const filename = `${plugin.id}-${plugin.version}.zip`;
    fs.copyFileSync(path.join(repo, "dist/zips", filename), path.join(dir, "zips", filename));
    plugin.downloadUrl = `zips/${filename}`;
  }
  fs.writeFileSync(path.join(dir, "registry.json"), JSON.stringify(registry, null, 2));
  return dir;
}
