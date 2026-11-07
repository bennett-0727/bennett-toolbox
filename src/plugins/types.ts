export type LocalizedText = {
  "zh-CN": string;
  "en-US": string;
};

export type PluginActivation = "on-demand" | "resident";

export interface PluginManifest {
  schemaVersion: 1;
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  version: string;
  apiVersion: 1;
  minAppVersion: string;
  main: string;
  icon: string;
  activation: PluginActivation;
  order?: number;
  recommended?: boolean;
  author?: string;
  homepage?: string;
}

export interface RegistryPlugin extends PluginManifest {
  downloadUrl: string;
  sha256: string;
  size: number;
}

export interface PluginRegistry {
  schemaVersion: 1;
  generatedAt: string;
  plugins: RegistryPlugin[];
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  activation: PluginActivation;
  installedAt: string;
}

export interface PluginSnapshot {
  installed: InstalledPlugin[];
  available: RegistryPlugin[];
  registryUpdatedAt: string | null;
  error?: string;
}

export interface PluginOperationResult {
  ok: boolean;
  error?: string;
  snapshot?: PluginSnapshot;
}

export interface PluginBundlePayload {
  manifest: PluginManifest;
  code: string;
  baseUrl: string;
}

export interface PluginStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface PluginApi {
  apiVersion: 1;
  pluginId: string;
  hostVersion: string;
  readonly locale: "zh-CN" | "en-US";
  readonly theme: string;
  t(text: string): string;
  onLocaleChange(callback: (locale: "zh-CN" | "en-US") => void): () => void;
  onThemeChange(callback: (theme: string) => void): () => void;
  storage: PluginStorage;
  assets: {
    url(relative: string): string;
  };
  log(...args: unknown[]): void;
}

export interface PluginInstance {
  mount?(container: HTMLElement, api: PluginApi): void | (() => void) | Promise<void | (() => void)>;
  unmount?(): void | Promise<void>;
  activate?(api: PluginApi): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export type PluginFactory = (api: PluginApi) => PluginInstance;
