import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: "http://127.0.0.1:5173",
        command: {
          executable: "npm",
          args: ["run", "dev", "--", "--port", "5173", "--strictPort"],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  timeout: 60_000,
} satisfies E2EConfig;
