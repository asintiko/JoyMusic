import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { invites, memberships } from "../src/db/schema";
import { sha256Hex } from "../src/lib/ids";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { addMember, apiOf, registerOwner, testPassword, type Actor } from "./helpers/factories";

describe("members and invites", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await createTestContext();
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);

  async function memberIdOf(actor: Actor, target: Actor): Promise<string> {
    const list = await api().ok("adminMembers", { token: actor.accessToken });
    const found = list.members.find((member) => member.userId === target.userId);
    if (!found) throw new Error("member not listed");
    return found.id;
  }

  describe("invites", () => {
    it("returns a token that is stored only as a hash and expires in seven days", async () => {
      const owner = await registerOwner(context);
      const email = `${uniq("dj")}@example.com`;
      const response = await api().call("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: email.toUpperCase() },
      });
      expect(response.status).toBe(201);
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("other")}@example.com` },
      });
      expect(invited.member).toMatchObject({ status: "invited", role: "dj", userId: null, name: null });
      expect(invited.inviteToken.length).toBeGreaterThanOrEqual(40);
      const [row] = await context.deps.db.select().from(invites).where(eq(invites.id, invited.member.id));
      expect(row?.tokenHash).toBe(sha256Hex(invited.inviteToken));
      expect(row?.tokenHash).not.toBe(invited.inviteToken);
      expect(row?.invitedBy).toBe(owner.userId);
      const ttl = (row?.expiresAt.getTime() ?? 0) - Date.now();
      expect(ttl).toBeGreaterThan(6.99 * 24 * 3600 * 1000);
      expect(ttl).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
    });

    it("normalizes the email and replaces an earlier pending invite", async () => {
      const owner = await registerOwner(context);
      const email = `${uniq("again")}@example.com`;
      const first = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email, role: "dj" },
      });
      const second = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: email.toUpperCase(), role: "admin" },
      });
      expect(second.member.email).toBe(email);
      const stale = await api().call("authInviteAccept", {
        body: { token: first.inviteToken, name: "Stale", password: testPassword },
      });
      expect(errorCode(stale)).toBe("invite_invalid");
      const list = await api().ok("adminMembers", { token: owner.accessToken });
      expect(list.members.filter((member) => member.email === email)).toHaveLength(1);
    });

    it("rejects inviting someone who already belongs to the organization", async () => {
      const owner = await registerOwner(context);
      const response = await api().call("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: owner.email.toUpperCase(), role: "dj" },
      });
      expect(response.status).toBe(409);
      expect(errorCode(response)).toBe("conflict");
    });

    it("lets only owners invite owners", async () => {
      const owner = await registerOwner(context);
      const admin = await addMember(context, owner, "admin");
      const byAdmin = await api().call("adminMemberInvite", {
        token: admin.accessToken,
        body: { email: `${uniq("co")}@example.com`, role: "owner" },
      });
      expect(byAdmin.status).toBe(403);
      const byOwner = await api().call("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("co")}@example.com`, role: "owner" },
      });
      expect(byOwner.status).toBe(201);
    });

    it("validates the email", async () => {
      const owner = await registerOwner(context);
      const response = await api().call("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: "nope", role: "dj" },
      });
      expect(response.status).toBe(400);
    });

    it("hides expired invites from the member list", async () => {
      const owner = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("expired")}@example.com`, role: "dj" },
      });
      await context.deps.db
        .update(invites)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(invites.id, invited.member.id));
      const list = await api().ok("adminMembers", { token: owner.accessToken });
      expect(list.members.map((member) => member.id)).not.toContain(invited.member.id);
    });
  });

  describe("listing", () => {
    it("shows active members first and pending invites after", async () => {
      const owner = await registerOwner(context);
      const dj = await addMember(context, owner, "dj");
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("pending")}@example.com`, role: "admin" },
      });
      const list = await api().ok("adminMembers", { token: owner.accessToken });
      expect(list.members.map((member) => [member.status, member.role])).toEqual([
        ["active", "owner"],
        ["active", "dj"],
        ["invited", "admin"],
      ]);
      expect(list.members[1]).toMatchObject({ userId: dj.userId, email: dj.email, name: dj.name });
      expect(list.members[2]?.id).toBe(invited.member.id);
    });
  });

  describe("role updates", () => {
    it("lets an owner change roles", async () => {
      const owner = await registerOwner(context);
      const dj = await addMember(context, owner, "dj");
      const updated = await api().ok("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: await memberIdOf(owner, dj) },
        body: { role: "admin" },
      });
      expect(updated).toMatchObject({ role: "admin", status: "active", userId: dj.userId });
      const me = await api().ok("me", { token: dj.accessToken });
      expect(me.memberships[0]?.role).toBe("admin");
    });

    it("updates the role of a pending invite", async () => {
      const owner = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("pending")}@example.com`, role: "dj" },
      });
      const updated = await api().ok("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: invited.member.id },
        body: { role: "admin" },
      });
      expect(updated).toMatchObject({ role: "admin", status: "invited" });
      const accepted = await api().ok("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Promoted", password: testPassword },
      });
      expect(accepted.me.memberships[0]?.role).toBe("admin");
    });

    it("refuses to demote the last owner but allows it once another owner exists", async () => {
      const owner = await registerOwner(context);
      const ownerMemberId = await memberIdOf(owner, owner);
      const blocked = await api().call("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: ownerMemberId },
        body: { role: "admin" },
      });
      expect(blocked.status).toBe(409);
      expect(errorCode(blocked)).toBe("conflict");
      const second = await addMember(context, owner, "dj");
      await api().ok("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: await memberIdOf(owner, second) },
        body: { role: "owner" },
      });
      const allowed = await api().call("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: ownerMemberId },
        body: { role: "admin" },
      });
      expect(allowed.status).toBe(200);
      const blockedAgain = await api().call("adminMemberUpdate", {
        token: second.accessToken,
        params: { id: await memberIdOf(second, second) },
        body: { role: "dj" },
      });
      expect(blockedAgain.status).toBe(409);
    });

    it("keeps admins away from owners and owner promotion", async () => {
      const owner = await registerOwner(context);
      const admin = await addMember(context, owner, "admin");
      const dj = await addMember(context, owner, "dj");
      const promote = await api().call("adminMemberUpdate", {
        token: admin.accessToken,
        params: { id: await memberIdOf(owner, dj) },
        body: { role: "owner" },
      });
      expect(promote.status).toBe(403);
      const selfPromote = await api().call("adminMemberUpdate", {
        token: admin.accessToken,
        params: { id: await memberIdOf(owner, admin) },
        body: { role: "owner" },
      });
      expect(selfPromote.status).toBe(403);
      const touchOwner = await api().call("adminMemberUpdate", {
        token: admin.accessToken,
        params: { id: await memberIdOf(owner, owner) },
        body: { role: "dj" },
      });
      expect(touchOwner.status).toBe(403);
      const manageDj = await api().call("adminMemberUpdate", {
        token: admin.accessToken,
        params: { id: await memberIdOf(owner, dj) },
        body: { role: "admin" },
      });
      expect(manageDj.status).toBe(200);
    });

    it("cannot modify members of other organizations", async () => {
      const owner = await registerOwner(context);
      const dj = await addMember(context, owner, "dj");
      const outsider = await registerOwner(context);
      const response = await api().call("adminMemberUpdate", {
        token: outsider.accessToken,
        params: { id: await memberIdOf(owner, dj) },
        body: { role: "admin" },
      });
      expect(response.status).toBe(404);
    });

    it("returns 404 for unknown members", async () => {
      const owner = await registerOwner(context);
      const response = await api().call("adminMemberUpdate", {
        token: owner.accessToken,
        params: { id: "mem_missing" },
        body: { role: "admin" },
      });
      expect(response.status).toBe(404);
    });
  });

  describe("removal", () => {
    it("removes members and revokes pending invites", async () => {
      const owner = await registerOwner(context);
      const dj = await addMember(context, owner, "dj");
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("revoked")}@example.com`, role: "dj" },
      });
      await api().ok("adminMemberDelete", {
        token: owner.accessToken,
        params: { id: await memberIdOf(owner, dj) },
      });
      await api().ok("adminMemberDelete", {
        token: owner.accessToken,
        params: { id: invited.member.id },
      });
      const list = await api().ok("adminMembers", { token: owner.accessToken });
      expect(list.members.map((member) => member.email)).toEqual([owner.email]);
      const acceptance = await api().call("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Late", password: testPassword },
      });
      expect(errorCode(acceptance)).toBe("invite_invalid");
      const removedAccess = await api().call("me", { token: dj.accessToken });
      expect(removedAccess.status).toBe(200);
      expect(((removedAccess.body as { memberships: unknown[] }).memberships)).toEqual([]);
    });

    it("refuses to remove the last owner", async () => {
      const owner = await registerOwner(context);
      const response = await api().call("adminMemberDelete", {
        token: owner.accessToken,
        params: { id: await memberIdOf(owner, owner) },
      });
      expect(response.status).toBe(409);
      expect(errorCode(response)).toBe("conflict");
    });

    it("allows an owner to leave when another owner remains", async () => {
      const owner = await registerOwner(context);
      const second = await addMember(context, owner, "owner");
      const response = await api().call("adminMemberDelete", {
        token: owner.accessToken,
        params: { id: await memberIdOf(owner, owner) },
      });
      expect(response.status).toBe(200);
      const list = await api().ok("adminMembers", { token: second.accessToken });
      expect(list.members.map((member) => member.userId)).toEqual([second.userId]);
    });

    it("prevents admins from removing owners", async () => {
      const owner = await registerOwner(context);
      const admin = await addMember(context, owner, "admin");
      const response = await api().call("adminMemberDelete", {
        token: admin.accessToken,
        params: { id: await memberIdOf(owner, owner) },
      });
      expect(response.status).toBe(403);
    });

    it("serializes concurrent demotions so an owner always remains", async () => {
      const owner = await registerOwner(context);
      const second = await addMember(context, owner, "owner");
      const ownerMember = await memberIdOf(owner, owner);
      const secondMember = await memberIdOf(owner, second);
      const results = await Promise.all([
        api().call("adminMemberUpdate", {
          token: owner.accessToken,
          params: { id: secondMember },
          body: { role: "dj" },
        }),
        api().call("adminMemberUpdate", {
          token: second.accessToken,
          params: { id: ownerMember },
          body: { role: "dj" },
        }),
      ]);
      const statuses = results.map((result) => result.status).sort();
      expect(statuses[0]).toBe(200);
      expect([403, 409]).toContain(statuses[1]);
      const remaining = await context.deps.db
        .select()
        .from(memberships)
        .where(and(eq(memberships.organizationId, owner.organizationId), eq(memberships.role, "owner")));
      expect(remaining).toHaveLength(1);
    });
  });
});
