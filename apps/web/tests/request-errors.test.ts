import { describe, expect, it } from "vitest";
import { ApiError } from "@joymusic/shared";
import {
  failureCopy,
  formatCountdown,
  mapRequestError,
  retryAfterOf,
} from "@/guest/request-errors";
import { messages } from "@/lib/messages";

describe("mapRequestError", () => {
  it("maps limit errors with retry details", () => {
    const failure = mapRequestError(
      new ApiError(429, "request_limit_reached", "limit", {
        limit: 3,
        windowMinutes: 30,
        retryAfterSeconds: 421.2,
      }),
    );
    expect(failure).toEqual({
      kind: "limit",
      retryAfterSeconds: 422,
      limit: 3,
      windowMinutes: 30,
    });
    expect(retryAfterOf(failure)).toBe(422);
  });

  it("falls back when limit details are missing", () => {
    const failure = mapRequestError(new ApiError(429, "request_limit_reached", "limit"));
    expect(failure).toMatchObject({ kind: "limit", retryAfterSeconds: 30, limit: null });
  });

  it.each([
    ["requests_closed", 403, "closed"],
    ["no_active_session", 409, "no_session"],
    ["free_text_disabled", 403, "free_text_disabled"],
    ["notes_disabled", 403, "notes_disabled"],
    ["forbidden", 403, "forbidden"],
    ["not_found", 404, "not_found"],
    ["internal", 500, "unknown"],
  ])("maps %s to %s", (code, status, kind) => {
    expect(mapRequestError(new ApiError(status, code, "x")).kind).toBe(kind);
  });

  it("maps content_blocked with the offending field", () => {
    expect(
      mapRequestError(new ApiError(422, "content_blocked", "x", { field: "dedicatedTo" })),
    ).toEqual({ kind: "blocked", field: "dedicatedTo" });
  });

  it("tells a repeated vote from a closed request", () => {
    expect(
      mapRequestError(new ApiError(409, "conflict", "You have already requested or voted")).kind,
    ).toBe("already_voted");
    expect(
      mapRequestError(new ApiError(409, "conflict", "This request is no longer open for votes"))
        .kind,
    ).toBe("not_open");
  });

  it("treats non API errors as network failures", () => {
    expect(mapRequestError(new TypeError("Failed to fetch"))).toEqual({ kind: "network" });
  });
});

describe("failureCopy", () => {
  it("has copy for every failure kind in every locale", () => {
    const kinds = [
      { kind: "closed" },
      { kind: "no_session" },
      { kind: "limit", retryAfterSeconds: 10, limit: 3, windowMinutes: 30 },
      { kind: "rate_limited", retryAfterSeconds: 5 },
      { kind: "blocked", field: null },
      { kind: "free_text_disabled" },
      { kind: "notes_disabled" },
      { kind: "already_voted" },
      { kind: "not_open" },
      { kind: "forbidden" },
      { kind: "not_found" },
      { kind: "network" },
      { kind: "unknown" },
    ] as const;
    for (const t of Object.values(messages)) {
      for (const failure of kinds) {
        const copy = failureCopy(failure, t);
        expect(copy.title.length).toBeGreaterThan(2);
        expect(copy.text.length).toBeGreaterThan(2);
      }
    }
  });

  it("mentions the limit numbers", () => {
    const copy = failureCopy(
      { kind: "limit", retryAfterSeconds: 60, limit: 3, windowMinutes: 30 },
      messages.en,
    );
    expect(copy.text).toContain("3");
    expect(copy.text).toContain("30");
  });
});

describe("formatCountdown", () => {
  it("formats minutes and padded seconds", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(421)).toBe("7:01");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
