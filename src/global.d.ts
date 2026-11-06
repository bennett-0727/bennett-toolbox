export {};

declare global {
  interface Window {
    require: (module: string) => any;
    EyeDropper?: new () => {
      open(): Promise<{ sRGBHex: string }>;
    };
  }
}
