import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError, errorBody } from "../errors";

function codeForStatus(status: number) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  return "validation_failed";
}

export function zodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String),
    code: issue.code,
    message: issue.message,
  }));
}

export function installErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof AppError) {
      for (const [name, value] of Object.entries(error.headers)) reply.header(name, value);
      return reply.code(error.status).send(errorBody(error.code, error.message, error.details));
    }
    if (error instanceof ZodError) {
      return reply
        .code(400)
        .send(errorBody("validation_failed", "Request validation failed", zodIssues(error)));
    }
    const status = "statusCode" in error ? error.statusCode : undefined;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return reply.code(status).send(errorBody(codeForStatus(status), error.message));
    }
    request.log.error({ err: error }, "unhandled error");
    return reply.code(500).send(errorBody("internal", "Internal server error"));
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send(
        errorBody("not_found", `Route ${request.method} ${request.url.split("?")[0]} not found`),
      ),
  );
}
