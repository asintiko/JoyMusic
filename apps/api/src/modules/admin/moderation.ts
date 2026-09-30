import type { FastifyPluginAsync } from "fastify";
import { asc, eq } from "drizzle-orm";
import { routes, type BannedWord } from "@joymusic/shared";
import { bannedWords, guestDevices } from "../../db/schema";
import { badRequest, conflict, isUniqueViolation, notFound } from "../../errors";
import { registerAdminRoute } from "../../http/register-route";
import { newId } from "../../lib/ids";
import { normalizeDisplayWord, toMatchKey } from "../../lib/text";
import { recordAudit } from "../audit/service";
import { adminRoles, assertOrgAccess, assertVenueAccess } from "../auth/guards";

const minimumWordLength = 2;

function toBannedWord(row: typeof bannedWords.$inferSelect): BannedWord {
  return { id: row.id, word: row.word, createdAt: row.createdAt.toISOString() };
}

export const adminModerationRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminBannedWords, async ({ org }) => {
    const rows = await db
      .select()
      .from(bannedWords)
      .where(eq(bannedWords.organizationId, org.organizationId))
      .orderBy(asc(bannedWords.word), asc(bannedWords.id));
    return { words: rows.map(toBannedWord) };
  });

  registerAdminRoute(app, routes.adminBannedWordAdd, async ({ body, org, user, reply }) => {
    const word = normalizeDisplayWord(body.word);
    const matchKey = toMatchKey(body.word);
    if (word.length < minimumWordLength || matchKey.length < minimumWordLength) {
      throw badRequest("Word is too short after normalization", [
        { path: ["word"], code: "too_small", message: "Word is too short after normalization" },
      ]);
    }
    try {
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(bannedWords)
          .values({ id: newId("bw"), organizationId: org.organizationId, word, matchKey })
          .returning();
        if (!row) throw notFound();
        await recordAudit(tx, {
          organizationId: org.organizationId,
          actorUserId: user.id,
          action: "banned_word.add",
          target: row.id,
          meta: { word },
        });
        return row;
      });
      reply.code(201);
      return toBannedWord(created);
    } catch (error) {
      if (isUniqueViolation(error, "banned_words_org_match_key_unique")) {
        throw conflict("This word is already banned");
      }
      throw error;
    }
  });

  registerAdminRoute(app, routes.adminBannedWordDelete, async ({ params, user }) => {
    const [row] = await db.select().from(bannedWords).where(eq(bannedWords.id, params.id)).limit(1);
    if (!row) throw notFound("Banned word not found");
    assertOrgAccess(user, row.organizationId, adminRoles);
    await db.transaction(async (tx) => {
      await tx.delete(bannedWords).where(eq(bannedWords.id, row.id));
      await recordAudit(tx, {
        organizationId: row.organizationId,
        actorUserId: user.id,
        action: "banned_word.remove",
        target: row.id,
        meta: { word: row.word },
      });
    });
    return { ok: true as const };
  });

  registerAdminRoute(app, routes.adminDeviceBan, async ({ params, user }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .insert(guestDevices)
        .values({ id: params.deviceId, venueId: venue.id, bannedAt: now })
        .onConflictDoUpdate({
          target: [guestDevices.venueId, guestDevices.id],
          set: { bannedAt: now },
        });
      await recordAudit(tx, {
        organizationId: venue.organizationId,
        actorUserId: user.id,
        action: "device.ban",
        target: params.deviceId,
        meta: { venueId: venue.id },
      });
    });
    return { ok: true as const };
  });
};
