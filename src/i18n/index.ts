import { getLanguage, setLanguage, translate, type Language } from "./messages";

export { LANGUAGES, getLanguage, setLanguage, translate, type Language } from "./messages";

const STORAGE_KEY = "bennett-language";

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en-US" || saved === "zh-CN") return saved;
  } catch {}
  return "zh-CN";
}

export function applyLanguage(language: Language) {
  setLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {}
  document.documentElement.lang = language;
  document.title = translate(language, "Bennett Toolbox - 多功能工具箱");
  if (typeof window !== "undefined" && typeof window.require === "function") {
    try {
      window.require("electron").ipcRenderer.send("set-language", language);
    } catch {}
  }
}

export function translateCurrent(text: string) {
  return translate(getLanguage(), text);
}
