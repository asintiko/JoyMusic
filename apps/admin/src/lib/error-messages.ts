import type { MessageKey } from "../i18n/messages";
import { describeError, type ErrorKind } from "./api-errors";
import type { Translate } from "../i18n/translate";

const keys: Record<ErrorKind, MessageKey> = {
  network: "err.network",
  invalid_credentials: "err.invalid_credentials",
  email_taken: "err.email_taken",
  invite_invalid: "err.invite_invalid",
  slug_taken: "err.slug_taken",
  last_owner: "err.last_owner",
  owner_only: "err.owner_only",
  forbidden: "err.forbidden",
  not_found: "err.not_found",
  conflict: "err.conflict",
  rate_limited: "err.rate_limited",
  validation: "err.validation",
  unauthorized: "err.unauthorized",
  server: "err.server",
  unknown: "err.unknown",
};

export function errorMessageKey(kind: ErrorKind): MessageKey {
  return keys[kind];
}

export function errorText(t: Translate, error: unknown): string {
  const description = describeError(error);
  const seconds = description.retryAfterSeconds ?? 60;
  return t(errorMessageKey(description.kind), { seconds });
}
