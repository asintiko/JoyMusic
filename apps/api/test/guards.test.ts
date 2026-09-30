import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import {
  addMember,
  apiOf,
  createVenue,
  makePlatformAdmin,
  registerOwner,
  testPassword,
} from "./helpers/factories";

describe("organization context and platform admin", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await createTestContext();
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);

  async function joinAsAdmin(host: Awaited<ReturnType<typeof registerOwner>>, email: string) {
    const invited = await api().ok("adminMemberInvite", {
      token: host.accessToken,
      body: { email, role: "admin" },
    });
    return api().ok("authInviteAccept", {
      body: { token: invited.inviteToken, name: "Two Orgs", password: testPassword },
    });
  }

  describe("users with several organizations", () => {
    it("authorizes by-id routes through the resource's own organization", async () => {
      const home = await registerOwner(context);
      const host = await registerOwner(context);
      const hostVenue = await createVenue(context, host);
      const joined = await joinAsAdmin(host, home.email);
      expect(joined.me.memberships).toHaveLength(2);
      const fetched = await api().ok("adminVenueGet", {
        token: home.accessToken,
        params: { venueId: hostVenue.id },
      });
      expect(fetched.id).toBe(hostVenue.id);
    });

    it("selects the organization for collection routes with x-organization-id", async () => {
      const home = await registerOwner(context);
      const host = await registerOwner(context);
      const homeVenue = await createVenue(context, home);
      const hostVenue = await createVenue(context, host);
      await joinAsAdmin(host, home.email);
      const byDefault = await api().ok("adminVenues", { token: home.accessToken });
      expect(byDefault.venues.map((venue) => venue.id)).toEqual([homeVenue.id]);
      const selected = await api().ok("adminVenues", {
        token: home.accessToken,
        headers: { "x-organization-id": host.organizationId },
      });
      expect(selected.venues.map((venue) => venue.id)).toEqual([hostVenue.id]);
    });

    it("rejects a header for an organization the caller does not belong to", async () => {
      const home = await registerOwner(context);
      const stranger = await registerOwner(context);
      const response = await api().call("adminVenues", {
        token: home.accessToken,
        headers: { "x-organization-id": stranger.organizationId },
      });
      expect(response.status).toBe(403);
      expect(errorCode(response)).toBe("forbidden");
    });

    it("rejects a header selecting an organization where the caller is only a dj", async () => {
      const home = await registerOwner(context);
      const host = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: host.accessToken,
        body: { email: home.email, role: "dj" },
      });
      await api().ok("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Home", password: home.password },
      });
      const response = await api().call("adminVenues", {
        token: home.accessToken,
        headers: { "x-organization-id": host.organizationId },
      });
      expect(response.status).toBe(403);
      const djList = await api().ok("djVenues", { token: home.accessToken });
      expect(Array.isArray(djList.venues)).toBe(true);
    });

    it("lists venues of every organization for the dj app", async () => {
      const home = await registerOwner(context);
      const host = await registerOwner(context);
      const homeVenue = await createVenue(context, home);
      const hostVenue = await createVenue(context, host);
      const invited = await api().ok("adminMemberInvite", {
        token: host.accessToken,
        body: { email: home.email, role: "dj" },
      });
      await api().ok("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Home", password: home.password },
      });
      const result = await api().ok("djVenues", { token: home.accessToken });
      expect(result.venues.map((venue) => venue.id).sort()).toEqual(
        [homeVenue.id, hostVenue.id].sort(),
      );
    });
  });

  describe("platform admin", () => {
    it("bypasses membership checks on by-id routes", async () => {
      const owner = await registerOwner(context);
      const venue = await createVenue(context, owner);
      const platform = await registerOwner(context);
      await makePlatformAdmin(context, platform.userId);
      const me = await api().ok("me", { token: platform.accessToken });
      expect(me.isPlatformAdmin).toBe(true);
      const fetched = await api().ok("adminVenueGet", {
        token: platform.accessToken,
        params: { venueId: venue.id },
      });
      expect(fetched.id).toBe(venue.id);
      const updated = await api().ok("adminVenueUpdate", {
        token: platform.accessToken,
        params: { venueId: venue.id },
        body: { name: "Renamed By Platform" },
      });
      expect(updated.name).toBe("Renamed By Platform");
    });

    it("can act inside any organization through x-organization-id", async () => {
      const owner = await registerOwner(context);
      const venue = await createVenue(context, owner);
      const platform = await registerOwner(context);
      await makePlatformAdmin(context, platform.userId);
      const listed = await api().ok("adminVenues", {
        token: platform.accessToken,
        headers: { "x-organization-id": owner.organizationId },
      });
      expect(listed.venues.map((entry) => entry.id)).toEqual([venue.id]);
      const missing = await api().call("adminVenues", {
        token: platform.accessToken,
        headers: { "x-organization-id": "org_does_not_exist" },
      });
      expect(missing.status).toBe(404);
    });

    it("needs an organization context when it has no eligible membership", async () => {
      const platform = await registerOwner(context);
      await makePlatformAdmin(context, platform.userId);
      const member = await addMember(context, platform, "dj");
      await makePlatformAdmin(context, member.userId);
      const response = await api().call("adminMembers", { token: member.accessToken });
      expect(response.status).toBe(403);
      expect((response.body as { error: { message: string } }).error.message).toContain(
        "x-organization-id",
      );
    });
  });

  describe("removed members", () => {
    it("loses access immediately even with a still-valid access token", async () => {
      const owner = await registerOwner(context);
      const admin = await addMember(context, owner, "admin");
      const before = await api().call("adminVenues", { token: admin.accessToken });
      expect(before.status).toBe(200);
      const members = await api().ok("adminMembers", { token: owner.accessToken });
      const target = members.members.find((member) => member.email === admin.email);
      await api().ok("adminMemberDelete", {
        token: owner.accessToken,
        params: { id: target?.id ?? "" },
      });
      const after = await api().call("adminVenues", { token: admin.accessToken });
      expect(after.status).toBe(403);
    });
  });

  it("issues unique organization ids per registration", async () => {
    const first = await registerOwner(context, { email: `${uniq("a")}@example.com` });
    const second = await registerOwner(context, { email: `${uniq("b")}@example.com` });
    expect(first.organizationId).not.toBe(second.organizationId);
  });
});
