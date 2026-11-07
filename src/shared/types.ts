export interface ModuleInfo {
  id: string;
  name: string;
  icon: string;
  source?: "builtin" | "plugin";
  version?: string;
}
