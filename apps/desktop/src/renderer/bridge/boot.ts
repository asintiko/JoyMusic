import { installBridge } from "./access";

export async function bootBridge(): Promise<void> {
  if (window.joy) {
    installBridge(window.joy);
    return;
  }
  if (import.meta.env.MODE === "shim") {
    const { createShimBridge } = await import("./shim");
    installBridge(await createShimBridge());
    return;
  }
  throw new Error("Desktop bridge is not available");
}
