import { BridgeFailure } from "../bridge/access";
import type { Strings } from "../i18n/strings";

export function describeError(t: Strings, error: unknown): string {
  if (error instanceof BridgeFailure) {
    if (error.network) return t.errors.network;
    const known = t.errors[error.code];
    if (known) return known;
    if (error.status === 429) return t.errors.rate_limited;
  }
  return t.errors.generic;
}
