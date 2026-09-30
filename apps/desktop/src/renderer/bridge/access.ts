import type { BridgeError, DesktopBridge, Envelope } from "../../common/bridge";

export class BridgeFailure extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly network: boolean;
  readonly details: unknown;

  constructor(error: BridgeError) {
    super(error.message);
    this.name = "BridgeFailure";
    this.code = error.code;
    this.status = error.status;
    this.network = error.network === true;
    this.details = error.details;
  }
}

let cached: DesktopBridge | null = null;

export function installBridge(bridge: DesktopBridge): void {
  cached = bridge;
}

export function getBridge(): DesktopBridge {
  if (cached) return cached;
  if (window.joy) {
    cached = window.joy;
    return cached;
  }
  throw new Error("Desktop bridge is not available");
}

export function unwrap<T>(envelope: Envelope<T>): T {
  if (envelope.ok) return envelope.value;
  throw new BridgeFailure(envelope.error);
}

export function errorCodeOf(error: unknown): string {
  if (error instanceof BridgeFailure) return error.code;
  return "internal";
}
