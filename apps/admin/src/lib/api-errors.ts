import { ApiError, type ErrorCode } from "@joymusic/shared";

export type ErrorKind =
  | "network"
  | "invalid_credentials"
  | "email_taken"
  | "invite_invalid"
  | "slug_taken"
  | "last_owner"
  | "owner_only"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "validation"
  | "unauthorized"
  | "server"
  | "unknown";

export interface ErrorDescription {
  kind: ErrorKind;
  status: number | null;
  retryAfterSeconds: number | null;
  field: string | null;
}

function fieldFromDetails(details: unknown): string | null {
  if (Array.isArray(details)) {
    const first: unknown = details[0];
    if (first && typeof first === "object" && "path" in first) {
      const path = (first as { path: unknown }).path;
      if (Array.isArray(path) && path.length > 0) return String(path[0]);
    }
  }
  if (details && typeof details === "object" && "field" in details) {
    const field = (details as { field: unknown }).field;
    if (typeof field === "string") return field;
  }
  return null;
}

function retryAfter(details: unknown): number | null {
  if (details && typeof details === "object" && "retryAfterSeconds" in details) {
    const value = (details as { retryAfterSeconds: unknown }).retryAfterSeconds;
    if (typeof value === "number") return value;
  }
  return null;
}

const byCode: Partial<Record<ErrorCode, ErrorKind>> = {
  invalid_credentials: "invalid_credentials",
  email_taken: "email_taken",
  invite_invalid: "invite_invalid",
  rate_limited: "rate_limited",
  validation_failed: "validation",
  unauthorized: "unauthorized",
  not_found: "not_found",
  internal: "server",
};

export function describeError(error: unknown): ErrorDescription {
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    let kind: ErrorKind = byCode[error.code as ErrorCode] ?? "unknown";
    if (error.code === "conflict") {
      if (message.includes("slug")) kind = "slug_taken";
      else if (message.includes("last owner")) kind = "last_owner";
      else kind = "conflict";
    } else if (error.code === "forbidden") {
      kind = message.includes("owners") ? "owner_only" : "forbidden";
    } else if (error.status >= 500) {
      kind = "server";
    }
    return {
      kind,
      status: error.status,
      retryAfterSeconds: retryAfter(error.details),
      field: fieldFromDetails(error.details),
    };
  }
  if (error instanceof TypeError) {
    return { kind: "network", status: null, retryAfterSeconds: null, field: null };
  }
  return { kind: "unknown", status: null, retryAfterSeconds: null, field: null };
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
