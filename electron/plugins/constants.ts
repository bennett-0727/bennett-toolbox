import * as electron from "electron";
import * as path from "path";

export {
  PLUGIN_MAX_ENTRIES,
  PLUGIN_REGISTRY_MAX_BYTES,
  PLUGIN_UNZIPPED_MAX_BYTES,
  PLUGIN_ZIP_MAX_BYTES,
} from "./limits";

export const PLUGIN_REPO = "bennett-0727/bennett-toolbox-plugins";
export const PLUGIN_REGISTRY_URL =
  process.env.BENNETT_PLUGIN_REGISTRY_URL ||
  `https://github.com/${PLUGIN_REPO}/releases/latest/download/registry.json`;

export const ALLOWED_DOWNLOAD_HOSTS = new Set([
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
]);

export const pluginsRoot = () => path.join(electron.app.getPath("userData"), "plugins");
export const pluginsStatePath = () => path.join(pluginsRoot(), "plugins-state.json");
export const pluginsRegistryCachePath = () => path.join(pluginsRoot(), "registry-cache.json");
export const pluginsStagingPath = () => path.join(pluginsRoot(), ".staging");
