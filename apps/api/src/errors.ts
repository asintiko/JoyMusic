import type { ApiErrorBody, ErrorCode } from "@joymusic/shared";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;
  readonly headers: Record<string, string>;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    options: { details?: unknown; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = options.details;
    this.headers = options.headers ?? {};
  }

  get statusCode(): number {
    return this.status;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError("validation_failed", 400, message, { details });

export const unauthorized = (message = "Authentication required") =>
  new AppError("unauthorized", 401, message);

export const forbidden = (message = "You do not have permission to do this") =>
  new AppError("forbidden", 403, message);

export const notFound = (message = "Resource not found") => new AppError("not_found", 404, message);

export const conflict = (message: string) => new AppError("conflict", 409, message);

export const rateLimited = (message: string, retryAfterSeconds: number) =>
  new AppError("rate_limited", 429, message, {
    details: { retryAfterSeconds },
    headers: { "retry-after": String(retryAfterSeconds) },
  });

export const notImplemented = (message = "Not implemented") =>
  new AppError("internal", 501, message);

export function errorBody(code: ErrorCode | (string & {}), message: string, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return body;
}

interface DatabaseErrorShape {
  code?: unknown;
  constraint_name?: unknown;
  cause?: unknown;
}

function databaseErrorChain(error: unknown): DatabaseErrorShape[] {
  const chain: DatabaseErrorShape[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const shape = current as DatabaseErrorShape;
    chain.push(shape);
    current = shape.cause;
  }
  return chain;
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  return databaseErrorChain(error).some(
    (shape) =>
      shape.code === "23505" && (constraint === undefined || shape.constraint_name === constraint),
  );
}

export const requestsClosed = () =>
  new AppError("requests_closed", 403, "Requests are closed at this venue right now");

export const noActiveSession = () =>
  new AppError("no_active_session", 409, "The DJ has not started a session yet");

export const freeTextDisabled = () =>
  new AppError("free_text_disabled", 403, "Free text requests are disabled at this venue");

export const notesDisabled = () =>
  new AppError("notes_disabled", 403, "Notes and dedications are disabled at this venue");

export const contentBlocked = (field: string) =>
  new AppError("content_blocked", 422, "The text contains words that are not allowed", {
    details: { field },
  });

export const requestLimitReached = (
  limit: number,
  windowMinutes: number,
  retryAfterSeconds: number,
) =>
  new AppError("request_limit_reached", 429, "Request limit reached, try again later", {
    details: { limit, windowMinutes, retryAfterSeconds },
    headers: { "retry-after": String(retryAfterSeconds) },
  });
