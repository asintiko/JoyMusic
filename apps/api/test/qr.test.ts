import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { qrCodes } from "../src/db/schema";
import { errorCode } from "./helpers/api";
import { createTestContext, type TestContext } from "./helpers/context";
import { apiOf, createVenue, registerOwner, type Actor } from "./helpers/factories";

describe("qr codes", () => {
  let context: TestContext;
  let owner: Actor;
  beforeAll(async () => {
    context = await createTestContext();
    owner = await registerOwner(context);
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);

  it("creates codes with a random url-safe 12 character token and a public url", async () => {
    const venue = await createVenue(context, owner);
    const created = await api().call("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Table 1" },
    });
    expect(created.status).toBe(201);
    const code = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "  Bar  " },
    });
    expect(code.label).toBe("Bar");
    expect(code.token).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(code.url).toBe(`https://joymusic.test/v/${venue.slug}?t=${code.token}`);
    expect(code).toMatchObject({ scans: 0, active: true, venueId: venue.id });
    const second = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Bar" },
    });
    expect(second.token).not.toBe(code.token);
  });

  it("lists codes of a venue in creation order", async () => {
    const venue = await createVenue(context, owner);
    for (const label of ["Table 1", "Table 2", "Bar"]) {
      await api().ok("adminQrCreate", {
        token: owner.accessToken,
        params: { venueId: venue.id },
        body: { label },
      });
    }
    const listed = await api().ok("adminQrList", {
      token: owner.accessToken,
      params: { venueId: venue.id },
    });
    expect(listed.codes.map((code) => code.label)).toEqual(["Table 1", "Table 2", "Bar"]);
  });

  it("updates label and active flag independently", async () => {
    const venue = await createVenue(context, owner);
    const code = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Old" },
    });
    const relabeled = await api().ok("adminQrUpdate", {
      token: owner.accessToken,
      params: { id: code.id },
      body: { label: "New" },
    });
    expect(relabeled).toMatchObject({ label: "New", active: true, token: code.token });
    const deactivated = await api().ok("adminQrUpdate", {
      token: owner.accessToken,
      params: { id: code.id },
      body: { active: false },
    });
    expect(deactivated).toMatchObject({ label: "New", active: false });
    const empty = await api().call("adminQrUpdate", {
      token: owner.accessToken,
      params: { id: code.id },
      body: { label: "" },
    });
    expect(empty.status).toBe(400);
  });

  it("deletes codes and answers 404 afterwards", async () => {
    const venue = await createVenue(context, owner);
    const code = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Temp" },
    });
    const deleted = await api().ok("adminQrDelete", {
      token: owner.accessToken,
      params: { id: code.id },
    });
    expect(deleted.ok).toBe(true);
    const rows = await context.deps.db.select().from(qrCodes).where(eq(qrCodes.id, code.id));
    expect(rows).toHaveLength(0);
    const again = await api().call("adminQrDelete", {
      token: owner.accessToken,
      params: { id: code.id },
    });
    expect(again.status).toBe(404);
    expect(errorCode(again)).toBe("not_found");
  });

  it("hides codes of deleted venues", async () => {
    const venue = await createVenue(context, owner);
    const code = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Ghost" },
    });
    await api().ok("adminVenueDelete", { token: owner.accessToken, params: { venueId: venue.id } });
    const response = await api().call("adminQrUpdate", {
      token: owner.accessToken,
      params: { id: code.id },
      body: { active: false },
    });
    expect(response.status).toBe(404);
    const list = await api().call("adminQrList", {
      token: owner.accessToken,
      params: { venueId: venue.id },
    });
    expect(list.status).toBe(404);
  });

  it("builds urls from PUBLIC_WEB_URL without a doubled slash", async () => {
    const custom = await createTestContext({ env: { PUBLIC_WEB_URL: "https://joy.example/" } });
    try {
      const actor = await registerOwner(custom);
      const venue = await createVenue(custom, actor);
      const code = await apiOf(custom).ok("adminQrCreate", {
        token: actor.accessToken,
        params: { venueId: venue.id },
        body: { label: "Slash" },
      });
      expect(code.url).toBe(`https://joy.example/v/${venue.slug}?t=${code.token}`);
    } finally {
      await custom.close();
    }
  });
});
