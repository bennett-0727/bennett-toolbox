import { translate } from "../i18n";
import { getLanguage } from "../i18n";
import { APP_VERSION } from "../shared/version";
import { readPluginBundle } from "./client";
import type {
  PluginApi,
  PluginFactory,
  PluginInstance,
  PluginManifest,
} from "./types";

const REGISTER_KEY = "__BENNETT_REGISTER_PLUGIN__";

interface ApiState {
  locale: "zh-CN" | "en-US";
  theme: string;
  localeCallbacks: Set<(locale: "zh-CN" | "en-US") => void>;
  themeCallbacks: Set<(theme: string) => void>;
}

interface LoadedPlugin {
  version: string;
  factory: PluginFactory;
  instance: PluginInstance;
  api: PluginApi;
  state: ApiState;
  activated: boolean;
  mountCleanup?: (() => void) | null;
}

const loaded = new Map<string, LoadedPlugin>();

function currentTheme(): string {
  if (typeof document === "undefined") return "glass-dark";
  return document.documentElement.dataset.theme || "glass-dark";
}

function createApi(manifest: PluginManifest, state: ApiState): PluginApi {
  return {
    apiVersion: 1,
    pluginId: manifest.id,
    hostVersion: APP_VERSION,
    get locale() {
      return state.locale;
    },
    get theme() {
      return state.theme;
    },
    t(text: string) {
      return translate(state.locale, text);
    },
    onLocaleChange(callback) {
      state.localeCallbacks.add(callback);
      return () => state.localeCallbacks.delete(callback);
    },
    onThemeChange(callback) {
      state.themeCallbacks.add(callback);
      return () => state.themeCallbacks.delete(callback);
    },
    storage: {
      get(key) {
        try {
          return localStorage.getItem(`bennett-plugin:${manifest.id}:${key}`);
        } catch {
          return null;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(`bennett-plugin:${manifest.id}:${key}`, value);
        } catch {}
      },
      remove(key) {
        try {
          localStorage.removeItem(`bennett-plugin:${manifest.id}:${key}`);
        } catch {}
      },
    },
    log(...args) {
      console.log(`[plugin:${manifest.id}]`, ...args);
    },
  };
}

async function loadFactory(manifest: PluginManifest): Promise<PluginFactory> {
  const bundle = await readPluginBundle(manifest.id);
  if (bundle.manifest.id !== manifest.id || bundle.manifest.version !== manifest.version) {
    throw new Error("插件版本已变化，请重新加载");
  }

  const win = window as unknown as Record<string, unknown>;
  let factory: PluginFactory | null = null;
  win[REGISTER_KEY] = (id: string, value: PluginFactory) => {
    if (id !== manifest.id) throw new Error(`插件注册 id 不匹配: ${id}`);
    if (factory) throw new Error("插件重复注册");
    factory = value;
  };
  try {
    new Function(bundle.code)();
  } finally {
    delete win[REGISTER_KEY];
  }
  await Promise.resolve();
  if (!factory) throw new Error("插件未注册入口");
  return factory;
}

async function ensurePlugin(
  manifest: PluginManifest,
  locale: "zh-CN" | "en-US",
  theme: string,
): Promise<LoadedPlugin> {
  let entry = loaded.get(manifest.id);
  if (entry && entry.version !== manifest.version) {
    await disposePlugin(manifest.id);
    entry = undefined;
  }
  if (!entry) {
    const factory = await loadFactory(manifest);
    const state: ApiState = {
      locale,
      theme,
      localeCallbacks: new Set(),
      themeCallbacks: new Set(),
    };
    const api = createApi(manifest, state);
    const instance = factory(api);
    entry = {
      version: manifest.version,
      factory,
      instance,
      api,
      state,
      activated: false,
    };
    loaded.set(manifest.id, entry);
  } else {
    entry.state.locale = locale;
    entry.state.theme = theme;
  }
  return entry;
}

export async function activatePlugin(
  manifest: PluginManifest,
  locale = getLanguage(),
  theme = currentTheme(),
): Promise<void> {
  const entry = await ensurePlugin(manifest, locale, theme);
  if (entry.activated) return;
  await entry.instance.activate?.(entry.api);
  entry.activated = true;
}

export async function mountPlugin(
  manifest: PluginManifest,
  container: HTMLElement,
  locale = getLanguage(),
  theme = currentTheme(),
): Promise<() => Promise<void>> {
  const entry = await ensurePlugin(manifest, locale, theme);
  if (entry.mountCleanup) {
    entry.mountCleanup();
    entry.mountCleanup = null;
    await entry.instance.unmount?.();
  }
  const cleanup = await entry.instance.mount?.(container, entry.api);
  entry.mountCleanup = typeof cleanup === "function" ? cleanup : null;
  return async () => {
    entry.mountCleanup?.();
    entry.mountCleanup = null;
    await entry.instance.unmount?.();
  };
}

export async function disposePlugin(id: string): Promise<void> {
  const entry = loaded.get(id);
  if (!entry) return;
  try {
    entry.mountCleanup?.();
    await entry.instance.unmount?.();
    await entry.instance.deactivate?.();
  } catch (error) {
    console.error(`[plugin:${id}] dispose failed`, error);
  }
  loaded.delete(id);
}

export function syncPluginLocale(locale: "zh-CN" | "en-US"): void {
  for (const entry of loaded.values()) {
    if (entry.state.locale === locale) continue;
    entry.state.locale = locale;
    for (const callback of entry.state.localeCallbacks) callback(locale);
  }
}

export function syncPluginTheme(theme: string): void {
  for (const entry of loaded.values()) {
    if (entry.state.theme === theme) continue;
    entry.state.theme = theme;
    for (const callback of entry.state.themeCallbacks) callback(theme);
  }
}
