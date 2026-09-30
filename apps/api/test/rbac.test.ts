import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RouteName } from "@joymusic/shared";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { addMember, apiOf, createVenue, registerOwner, type Actor } from "./helpers/factories";

interface Fixtures {
  venueId: string;
  qrId: string;
  memberId: string;
  wordId: string;
  deviceId: string;
}

interface AccessCase {
  label: string;
  route: RouteName;
  scope: "collection" | "resource";
  input: (fixtures: Fixtures) => Record<string, unknown>;
}

const cases: AccessCase[] = [
  { label: "list venues", route: "adminVenues", scope: "collection", input: () => ({}) },
  {
    label: "create venue",
    route: "adminVenueCreate",
    scope: "collection",
    input: () => ({ body: { name: "Created", slug: `created-${uniq()}` } }),
  },
  {
    label: "get venue",
    route: "adminVenueGet",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId } }),
  },
  {
    label: "update venue",
    route: "adminVenueUpdate",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId }, body: { name: "Renamed" } }),
  },
  {
    label: "delete venue",
    route: "adminVenueDelete",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId } }),
  },
  {
    label: "list qr",
    route: "adminQrList",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId } }),
  },
  {
    label: "create qr",
    route: "adminQrCreate",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId }, body: { label: "Table 9" } }),
  },
  {
    label: "update qr",
    route: "adminQrUpdate",
    scope: "resource",
    input: (f) => ({ params: { id: f.qrId }, body: { active: false } }),
  },
  {
    label: "delete qr",
    route: "adminQrDelete",
    scope: "resource",
    input: (f) => ({ params: { id: f.qrId } }),
  },
  { label: "list members", route: "adminMembers", scope: "collection", input: () => ({}) },
  {
    label: "invite member",
    route: "adminMemberInvite",
    scope: "collection",
    input: () => ({ body: { email: `${uniq("invite")}@example.com`, role: "dj" } }),
  },
  {
    label: "update member",
    route: "adminMemberUpdate",
    scope: "resource",
    input: (f) => ({ params: { id: f.memberId }, body: { role: "admin" } }),
  },
  {
    label: "delete member",
    route: "adminMemberDelete",
    scope: "resource",
    input: (f) => ({ params: { id: f.memberId } }),
  },
  {
    label: "list sessions",
    route: "adminSessions",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId }, query: {} }),
  },
  {
    label: "analytics",
    route: "adminAnalytics",
    scope: "collection",
    input: () => ({ query: {} }),
  },
  {
    label: "analytics for venue",
    route: "adminAnalytics",
    scope: "resource",
    input: (f) => ({ query: { venueId: f.venueId } }),
  },
  { label: "list banned words", route: "adminBannedWords", scope: "collection", input: () => ({}) },
  {
    label: "add banned word",
    route: "adminBannedWordAdd",
    scope: "collection",
    input: () => ({ body: { word: `word${uniq()}` } }),
  },
  {
    label: "delete banned word",
    route: "adminBannedWordDelete",
    scope: "resource",
    input: (f) => ({ params: { id: f.wordId } }),
  },
  {
    label: "ban device",
    route: "adminDeviceBan",
    scope: "resource",
    input: (f) => ({ params: { venueId: f.venueId, deviceId: f.deviceId } }),
  },
  { label: "audit log", route: "adminAudit", scope: "collection", input: () => ({ query: {} }) },
];

describe("role based access matrix", () => {
  let context: TestContext;
  let owner: Actor;
  let admin: Actor;
  let dj: Actor;
  let outsider: Actor;

  beforeAll(async () => {
    context = await createTestContext();
    owner = await registerOwner(context);
    admin = await addMember(context, owner, "admin");
    dj = await addMember(context, owner, "dj");
    outsider = await registerOwner(context);
  });
  afterAll(async () => {
    await context.close();
  });

  const api = () => apiOf(context);

  async function prepare(): Promise<Fixtures> {
    const venue = await createVenue(context, owner);
    const qr = await api().ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Table 1" },
    });
    const invite = await api().ok("adminMemberInvite", {
      token: owner.accessToken,
      body: { email: `${uniq("target")}@example.com`, role: "dj" },
    });
    const word = await api().ok("adminBannedWordAdd", {
      token: owner.accessToken,
      body: { word: `seed${uniq()}` },
    });
    return {
      venueId: venue.id,
      qrId: qr.id,
      memberId: invite.member.id,
      wordId: word.id,
      deviceId: `device-${uniq()}`,
    };
  }

  describe.each(cases)("$label ($route)", (accessCase) => {
    const attempt = async (actor: Actor | null) => {
      const fixtures = await prepare();
      const input = accessCase.input(fixtures);
      return api().raw(accessCase.route, { ...input, token: actor?.accessToken });
    };

    it("allows the owner", async () => {
      const response = await attempt(owner);
      expect(response.status, JSON.stringify(response.body)).toBeGreaterThanOrEqual(200);
      expect(response.status, JSON.stringify(response.body)).toBeLessThan(300);
    });

    it("allows an admin", async () => {
      const response = await attempt(admin);
      expect(response.status, JSON.stringify(response.body)).toBeGreaterThanOrEqual(200);
      expect(response.status, JSON.stringify(response.body)).toBeLessThan(300);
    });

    it("forbids a dj", async () => {
      const response = await attempt(dj);
      expect(response.status).toBe(403);
      expect(errorCode(response)).toBe("forbidden");
    });

    it("hides resources from another organization and scopes collections to it", async () => {
      const response = await attempt(outsider);
      if (accessCase.scope === "resource") {
        expect(response.status).toBe(404);
        expect(errorCode(response)).toBe("not_found");
      } else {
        expect(response.status, JSON.stringify(response.body)).toBeGreaterThanOrEqual(200);
        expect(response.status, JSON.stringify(response.body)).toBeLessThan(300);
      }
    });

    it("requires authentication", async () => {
      const response = await attempt(null);
      expect(response.status).toBe(401);
      expect(errorCode(response)).toBe("unauthorized");
    });
  });

  describe("dj routes", () => {
    it("lets every organization role list their venues but not anonymous callers", async () => {
      const venue = await createVenue(context, owner);
      for (const actor of [owner, admin, dj]) {
        const result = await api().ok("djVenues", { token: actor.accessToken });
        expect(result.venues.map((entry) => entry.id)).toContain(venue.id);
      }
      const outsiderVenues = await api().ok("djVenues", { token: outsider.accessToken });
      expect(outsiderVenues.venues.map((entry) => entry.id)).not.toContain(venue.id);
      const anonymous = await api().call("djVenues");
      expect(anonymous.status).toBe(401);
    });
  });

  describe("data isolation", () => {
    it("never leaks another organization's data through collection routes", async () => {
      const venue = await createVenue(context, owner, { name: "Owner Only Venue" });
      await api().ok("adminBannedWordAdd", {
        token: owner.accessToken,
        body: { word: `private${uniq()}` },
      });
      const venues = await api().ok("adminVenues", { token: outsider.accessToken });
      expect(venues.venues.map((entry) => entry.id)).not.toContain(venue.id);
      const words = await api().ok("adminBannedWords", { token: outsider.accessToken });
      expect(words.words.filter((word) => word.word.startsWith("private"))).toHaveLength(0);
      const members = await api().ok("adminMembers", { token: outsider.accessToken });
      expect(members.members.map((member) => member.email)).not.toContain(owner.email);
      const audit = await api().ok("adminAudit", { token: outsider.accessToken });
      expect(audit.entries.map((entry) => entry.target)).not.toContain(venue.id);
    });
  });
});
