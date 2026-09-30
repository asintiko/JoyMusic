import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, bannedWords, guestDevices } from "../src/db/schema";
import { newId } from "../src/lib/ids";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { addMember, apiOf, createVenue, registerOwner, type Actor } from "./helpers/factories";

describe("moderation", () => {
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

  describe("banned words", () => {
    it("normalizes case, punctuation and Latin diacritics but keeps Cyrillic letters", async () => {
      const actor = await registerOwner(context);
      const latin = await api().ok("adminBannedWordAdd", {
        token: actor.accessToken,
        body: { word: "  FÜCK!! " },
      });
      expect(latin.word).toBe("fuck");
      const cyrillic = await api().ok("adminBannedWordAdd", {
        token: actor.accessToken,
        body: { word: "Хуй" },
      });
      expect(cyrillic.word).toBe("хуй");
      const uzbek = await api().ok("adminBannedWordAdd", {
        token: actor.accessToken,
        body: { word: "Oʻgʻri" },
      });
      expect(uzbek.word).toBe("oʻgʻri");
      const rows = await context.deps.db
        .select()
        .from(bannedWords)
        .where(eq(bannedWords.organizationId, actor.organizationId));
      const keys = Object.fromEntries(rows.map((row) => [row.word, row.matchKey]));
      expect(keys).toEqual({ fuck: "fuck", хуй: "xuy", oʻgʻri: "ogri" });
    });

    it("treats Cyrillic and Latin spellings of the same word as duplicates", async () => {
      const actor = await registerOwner(context);
      const first = await api().call("adminBannedWordAdd", {
        token: actor.accessToken,
        body: { word: "Сука" },
      });
      expect(first.status).toBe(201);
      for (const variant of ["suka", "SUKA!!!", "suuuka", "сука"]) {
        const duplicate = await api().call("adminBannedWordAdd", {
          token: actor.accessToken,
          body: { word: variant },
        });
        expect(duplicate.status, variant).toBe(409);
        expect(errorCode(duplicate)).toBe("conflict");
      }
    });

    it("rejects words that normalize to almost nothing", async () => {
      const response = await api().call("adminBannedWordAdd", {
        token: owner.accessToken,
        body: { word: "a!" },
      });
      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe("validation_failed");
      const tooShort = await api().call("adminBannedWordAdd", {
        token: owner.accessToken,
        body: { word: "x" },
      });
      expect(tooShort.status).toBe(400);
    });

    it("lists words alphabetically and keeps organizations apart", async () => {
      const actor = await registerOwner(context);
      const other = await registerOwner(context);
      for (const word of ["zebra", "apple", "mango"]) {
        await api().ok("adminBannedWordAdd", { token: actor.accessToken, body: { word } });
      }
      await api().ok("adminBannedWordAdd", { token: other.accessToken, body: { word: "zebra" } });
      const listed = await api().ok("adminBannedWords", { token: actor.accessToken });
      expect(listed.words.map((word) => word.word)).toEqual(["apple", "mango", "zebra"]);
      const otherList = await api().ok("adminBannedWords", { token: other.accessToken });
      expect(otherList.words.map((word) => word.word)).toEqual(["zebra"]);
    });

    it("deletes words, refuses foreign words and reports missing ones", async () => {
      const actor = await registerOwner(context);
      const other = await registerOwner(context);
      const word = await api().ok("adminBannedWordAdd", {
        token: actor.accessToken,
        body: { word: `temp${uniq()}` },
      });
      const foreign = await api().call("adminBannedWordDelete", {
        token: other.accessToken,
        params: { id: word.id },
      });
      expect(foreign.status).toBe(404);
      const deleted = await api().ok("adminBannedWordDelete", {
        token: actor.accessToken,
        params: { id: word.id },
      });
      expect(deleted.ok).toBe(true);
      const again = await api().call("adminBannedWordDelete", {
        token: actor.accessToken,
        params: { id: word.id },
      });
      expect(again.status).toBe(404);
    });
  });

  describe("device bans", () => {
    it("bans known and unknown devices idempotently", async () => {
      const actor = await registerOwner(context);
      const venue = await createVenue(context, actor);
      const known = `device-${uniq()}`;
      await context.deps.db.insert(guestDevices).values({ id: known, venueId: venue.id });
      const unknown = `device-${uniq()}`;
      for (const deviceId of [known, unknown, unknown]) {
        const response = await api().ok("adminDeviceBan", {
          token: actor.accessToken,
          params: { venueId: venue.id, deviceId },
        });
        expect(response.ok).toBe(true);
      }
      const rows = await context.deps.db
        .select()
        .from(guestDevices)
        .where(eq(guestDevices.venueId, venue.id));
      expect(rows.map((row) => row.id).sort()).toEqual([known, unknown].sort());
      expect(rows.every((row) => row.bannedAt instanceof Date)).toBe(true);
    });

    it("only bans within the venue's own scope", async () => {
      const actor = await registerOwner(context);
      const venue = await createVenue(context, actor);
      const other = await createVenue(context, actor);
      const deviceId = `device-${uniq()}`;
      await api().ok("adminDeviceBan", {
        token: actor.accessToken,
        params: { venueId: venue.id, deviceId },
      });
      const rows = await context.deps.db
        .select()
        .from(guestDevices)
        .where(eq(guestDevices.venueId, other.id));
      expect(rows).toHaveLength(0);
    });
  });

  describe("audit log", () => {
    it("records every mutating admin action with actor and metadata", async () => {
      const actor = await registerOwner(context);
      const admin = await addMember(context, actor, "admin");
      const venue = await createVenue(context, actor);
      const token = { token: admin.accessToken };
      await api().ok("adminVenueUpdate", { ...token, params: { venueId: venue.id }, body: { name: "Audited" } });
      const qr = await api().ok("adminQrCreate", {
        ...token,
        params: { venueId: venue.id },
        body: { label: "T1" },
      });
      await api().ok("adminQrUpdate", { ...token, params: { id: qr.id }, body: { active: false } });
      await api().ok("adminQrDelete", { ...token, params: { id: qr.id } });
      const invite = await api().ok("adminMemberInvite", {
        ...token,
        body: { email: `${uniq("aud")}@example.com`, role: "dj" },
      });
      await api().ok("adminMemberUpdate", {
        ...token,
        params: { id: invite.member.id },
        body: { role: "admin" },
      });
      await api().ok("adminMemberDelete", { ...token, params: { id: invite.member.id } });
      const word = await api().ok("adminBannedWordAdd", { ...token, body: { word: "auditword" } });
      await api().ok("adminBannedWordDelete", { ...token, params: { id: word.id } });
      await api().ok("adminDeviceBan", {
        ...token,
        params: { venueId: venue.id, deviceId: "audit-device" },
      });
      await api().ok("adminVenueDelete", { ...token, params: { venueId: venue.id } });

      const log = await api().ok("adminAudit", { token: actor.accessToken, query: { limit: 200 } });
      const actions = log.entries.map((entry) => entry.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          "organization.create",
          "member.invite",
          "member.join",
          "venue.create",
          "venue.update",
          "qr.create",
          "qr.update",
          "qr.delete",
          "member.role_update",
          "member.invite_revoke",
          "banned_word.add",
          "banned_word.remove",
          "device.ban",
          "venue.delete",
        ]),
      );
      const update = log.entries.find((entry) => entry.action === "venue.update");
      expect(update).toMatchObject({
        actorName: admin.name,
        target: venue.id,
        meta: { fields: ["name"] },
      });
      const roleChange = log.entries.find((entry) => entry.action === "member.role_update");
      expect(roleChange?.meta).toMatchObject({ from: "dj", to: "admin", status: "invite" });
    });

    it("orders entries newest first, honours the limit and validates it", async () => {
      const actor = await registerOwner(context);
      for (let index = 0; index < 4; index += 1) {
        await createVenue(context, actor, { name: `Venue ${index}` });
      }
      const limited = await api().ok("adminAudit", { token: actor.accessToken, query: { limit: 3 } });
      expect(limited.entries).toHaveLength(3);
      const times = limited.entries.map((entry) => Date.parse(entry.createdAt));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      expect(limited.entries.every((entry) => entry.action === "venue.create")).toBe(true);
      const defaulted = await api().ok("adminAudit", { token: actor.accessToken });
      expect(defaulted.entries.length).toBeGreaterThanOrEqual(5);
      for (const limit of [0, 201, "abc"]) {
        const response = await api().call("adminAudit", {
          token: actor.accessToken,
          query: { limit: limit as number },
        });
        expect(response.status, String(limit)).toBe(400);
      }
    });

    it("labels entries without an actor as System and never leaks other organizations", async () => {
      const actor = await registerOwner(context);
      const other = await registerOwner(context);
      await context.deps.db.insert(auditLog).values({
        id: newId("aud"),
        organizationId: actor.organizationId,
        actorUserId: null,
        action: "system.cleanup",
        target: null,
        meta: { removed: 3 },
      });
      const log = await api().ok("adminAudit", { token: actor.accessToken });
      expect(log.entries[0]).toMatchObject({
        actorName: "System",
        action: "system.cleanup",
        target: null,
        meta: { removed: 3 },
      });
      const otherLog = await api().ok("adminAudit", { token: other.accessToken });
      expect(otherLog.entries.map((entry) => entry.action)).not.toContain("system.cleanup");
    });
  });
});
