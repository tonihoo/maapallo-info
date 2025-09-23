// Browser-safe environment variable access helpers
// Prefer values injected by bundler (DefinePlugin), but guard against missing `process` in runtime

type NodeProcessShim = { env?: Record<string, string | undefined> };
type WindowEnvShim = { __ENV__?: Record<string, string | undefined> };

export function env(name: string, fallback?: string): string | undefined {
  const p: NodeProcessShim | undefined =
    typeof process !== "undefined"
      ? (process as unknown as NodeProcessShim)
      : undefined;
  const w: (Window & WindowEnvShim) | undefined =
    typeof window !== "undefined"
      ? (window as unknown as Window & WindowEnvShim)
      : undefined;

  const fromProcess = p?.env?.[name];
  const fromWindow = w?.__ENV__?.[name];
  const value = fromProcess ?? fromWindow;
  return value !== undefined ? String(value) : fallback;
}

export function envBool(name: string, fallback = false): boolean {
  const v = env(name);
  if (v === undefined) return fallback;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}
