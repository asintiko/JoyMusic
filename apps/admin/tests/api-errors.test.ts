import { ApiError } from "@joymusic/shared";
import { describe, expect, it } from "vitest";
import { describeError } from "../src/lib/api-errors";
import { errorMessageKey } from "../src/lib/error-messages";

describe("describeError", () => {
  it("maps known API codes", () => {
    expect(describeError(new ApiError(401, "invalid_credentials", "x")).kind).toBe(
      "invalid_credentials",
    );
    expect(describeError(new ApiError(409, "email_taken", "x")).kind).toBe("email_taken");
    expect(describeError(new ApiError(400, "invite_invalid", "x")).kind).toBe("invite_invalid");
    expect(describeError(new ApiError(404, "not_found", "x")).kind).toBe("not_found");
  });

  it("distinguishes conflict flavours by message", () => {
    expect(
      describeError(new ApiError(409, "conflict", "A venue with this slug already exists")).kind,
    ).toBe("slug_taken");
    expect(
      describeError(
        new ApiError(409, "conflict", "Cannot demote the last owner of the organization"),
      ).kind,
    ).toBe("last_owner");
    expect(
      describeError(
        new ApiError(409, "conflict", "Cannot remove the last owner of the organization"),
      ).kind,
    ).toBe("last_owner");
    expect(describeError(new ApiError(409, "conflict", "Session is over")).kind).toBe("conflict");
  });

  it("distinguishes forbidden flavours", () => {
    expect(
      describeError(new ApiError(403, "forbidden", "Only owners can manage owners")).kind,
    ).toBe("owner_only");
    expect(describeError(new ApiError(403, "forbidden", "Forbidden")).kind).toBe("forbidden");
  });

  it("exposes retry-after seconds for rate limits", () => {
    const description = describeError(
      new ApiError(429, "rate_limited", "slow down", { retryAfterSeconds: 42 }),
    );
    expect(description.kind).toBe("rate_limited");
    expect(description.retryAfterSeconds).toBe(42);
  });

  it("extracts the failing field from validation details", () => {
    const description = describeError(
      new ApiError(400, "validation_failed", "bad", [{ path: ["timezone"], message: "x" }]),
    );
    expect(description.field).toBe("timezone");
    expect(description.kind).toBe("validation");
  });

  it("treats fetch failures as network errors and 5xx as server errors", () => {
    expect(describeError(new TypeError("Failed to fetch")).kind).toBe("network");
    expect(describeError(new ApiError(503, "internal", "db down")).kind).toBe("server");
    expect(describeError("boom").kind).toBe("unknown");
  });

  it("has a message key for every kind", () => {
    const kinds = [
      "network",
      "invalid_credentials",
      "email_taken",
      "invite_invalid",
      "slug_taken",
      "last_owner",
      "owner_only",
      "forbidden",
      "not_found",
      "conflict",
      "rate_limited",
      "validation",
      "unauthorized",
      "server",
      "unknown",
    ] as const;
    for (const kind of kinds) expect(errorMessageKey(kind)).toMatch(/^err\./);
  });
});
