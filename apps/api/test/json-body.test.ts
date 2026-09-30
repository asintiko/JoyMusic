import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TestContext } from "./helpers/context";
import { createFixture, newContext } from "./helpers/flow";

describe("json bodies", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await newContext();
  });
  afterAll(async () => {
    await context.close();
  });

  it("accepts an empty json body on routes without a body and rejects malformed json", async () => {
    const fixture = await createFixture(context, { startSession: false });
    const empty = await context.app.inject({
      method: "POST",
      url: `/v1/dj/venues/${fixture.venue.id}/sessions`,
      headers: {
        authorization: `Bearer ${fixture.owner.accessToken}`,
        "content-type": "application/json",
      },
    });
    expect(empty.statusCode).toBe(201);
    const broken = await context.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: "{nope",
    });
    expect(broken.statusCode).toBe(400);
    const missing = await context.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "content-type": "application/json" },
    });
    expect(missing.statusCode).toBe(400);
  });
});
