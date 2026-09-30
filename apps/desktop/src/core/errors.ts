import { ApiError } from "@joymusic/shared";
import type { BridgeError } from "../common/bridge";

export class NetworkFailure extends Error {
  constructor(message = "Network unavailable", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "NetworkFailure";
  }
}

export function isNetworkFailure(error: unknown): error is NetworkFailure {
  return error instanceof NetworkFailure;
}

export function toBridgeError(error: unknown): BridgeError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
    };
  }
  if (error instanceof NetworkFailure) {
    return { code: "network", message: error.message, network: true };
  }
  if (error instanceof Error && error.name === "ZodError") {
    return { code: "bad_response", message: "Unexpected server response" };
  }
  return {
    code: "internal",
    message: error instanceof Error ? error.message : "Unexpected error",
  };
}

export function wrapEnvelope<T>(work: () => Promise<T>) {
  return work().then(
    (value): { ok: true; value: T } => ({ ok: true, value }),
    (error: unknown): { ok: false; error: BridgeError } => ({
      ok: false,
      error: toBridgeError(error),
    }),
  );
}
