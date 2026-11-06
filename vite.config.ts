import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

function i18nJsxRuntime(): Plugin {
  return {
    name: "i18n-jsx-runtime",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !importer.startsWith(path.join(root, "src"))) return null;
      if (importer.includes(path.join(root, "src/i18n"))) return null;
      if (source === "react/jsx-runtime") return path.join(root, "src/i18n/jsx-runtime.ts");
      if (source === "react/jsx-dev-runtime") {
        return path.join(root, "src/i18n/jsx-dev-runtime.ts");
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [i18nJsxRuntime(), react()],
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "dist",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
