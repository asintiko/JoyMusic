import { isApiError } from "@/lib/api-error";
import type { Messages } from "@/lib/messages";

export type RequestFailure =
  | { kind: "closed" }
  | { kind: "no_session" }
  | { kind: "limit"; retryAfterSeconds: number; limit: number | null; windowMinutes: number | null }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "blocked"; field: string | null }
  | { kind: "free_text_disabled" }
  | { kind: "notes_disabled" }
  | { kind: "already_voted" }
  | { kind: "not_open" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "network" }
  | { kind: "unknown" };

interface LimitDetails {
  limit?: number;
  windowMinutes?: number;
  retryAfterSeconds?: number;
}

function numberField(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readLimitDetails(details: unknown): LimitDetails {
  if (typeof details !== "object" || details === null) return {};
  const source = details as Record<string, unknown>;
  return {
    limit: numberField(source, "limit"),
    windowMinutes: numberField(source, "windowMinutes"),
    retryAfterSeconds: numberField(source, "retryAfterSeconds"),
  };
}

function readBlockedField(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  const field = (details as Record<string, unknown>).field;
  return typeof field === "string" ? field : null;
}

const defaultRetrySeconds = 30;

export function mapRequestError(error: unknown): RequestFailure {
  if (!isApiError(error)) return { kind: "network" };
  switch (error.code) {
    case "requests_closed":
      return { kind: "closed" };
    case "no_active_session":
      return { kind: "no_session" };
    case "request_limit_reached": {
      const data = readLimitDetails(error.details);
      return {
        kind: "limit",
        retryAfterSeconds: Math.max(1, Math.ceil(data.retryAfterSeconds ?? defaultRetrySeconds)),
        limit: data.limit ?? null,
        windowMinutes: data.windowMinutes ?? null,
      };
    }
    case "rate_limited": {
      const seconds = readLimitDetails(error.details).retryAfterSeconds;
      return { kind: "rate_limited", retryAfterSeconds: Math.max(1, Math.ceil(seconds ?? 10)) };
    }
    case "content_blocked": {
      return { kind: "blocked", field: readBlockedField(error.details) };
    }
    case "free_text_disabled":
      return { kind: "free_text_disabled" };
    case "notes_disabled":
      return { kind: "notes_disabled" };
    case "conflict":
      return /no longer open|not open|ended/i.test(error.message)
        ? { kind: "not_open" }
        : { kind: "already_voted" };
    case "forbidden":
      return { kind: "forbidden" };
    case "not_found":
      return { kind: "not_found" };
    default:
      return error.status === 0 ? { kind: "network" } : { kind: "unknown" };
  }
}

export interface FailureCopy {
  title: string;
  text: string;
}

export function failureCopy(failure: RequestFailure, t: Messages): FailureCopy {
  switch (failure.kind) {
    case "closed":
      return { title: t.closedTitle, text: t.closedText };
    case "no_session":
      return { title: t.noSessionTitle, text: t.noSessionText };
    case "limit":
      return {
        title: t.limitTitle,
        text:
          failure.limit !== null && failure.windowMinutes !== null
            ? t.limitText(failure.limit, failure.windowMinutes)
            : t.rateLimitedText,
      };
    case "rate_limited":
      return { title: t.rateLimitedTitle, text: t.rateLimitedText };
    case "blocked":
      return { title: t.blockedTitle, text: t.blockedText };
    case "free_text_disabled":
      return { title: t.freeTextDisabledTitle, text: t.freeTextDisabledText };
    case "notes_disabled":
      return { title: t.genericTitle, text: t.notesDisabledText };
    case "already_voted":
      return { title: t.alreadyVotedTitle, text: t.alreadyVotedText };
    case "not_open":
      return { title: t.notOpenTitle, text: t.notOpenText };
    case "forbidden":
      return { title: t.forbiddenTitle, text: t.forbiddenText };
    case "network":
      return { title: t.networkTitle, text: t.networkText };
    case "not_found":
    case "unknown":
      return { title: t.genericTitle, text: t.genericText };
  }
}

export function retryAfterOf(failure: RequestFailure): number | null {
  return failure.kind === "limit" || failure.kind === "rate_limited"
    ? failure.retryAfterSeconds
    : null;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
