/// <reference types="vite/client" />

export {};

declare global {
  const __APP_VERSION__: string;

  interface Window {
    require: (module: string) => any;
    EyeDropper?: new () => {
      open(): Promise<{ sRGBHex: string }>;
    };
  }
}
