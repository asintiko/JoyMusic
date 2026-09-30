import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, isNull } from "drizzle-orm";
import { routes, type QrCode } from "@joymusic/shared";
import { qrCodes, venues } from "../../db/schema";
import { isUniqueViolation, notFound } from "../../errors";
import { registerAdminRoute } from "../../http/register-route";
import { newId, randomUrlToken } from "../../lib/ids";
import { recordAudit } from "../audit/service";
import { adminRoles, assertOrgAccess, assertVenueAccess } from "../auth/guards";

const tokenLength = 12;
const tokenAttempts = 5;

export const adminQrRoutes: FastifyPluginAsync = async (app) => {
  const { db, config } = app.deps;

  function toQrCode(row: typeof qrCodes.$inferSelect, slug: string): QrCode {
    return {
      id: row.id,
      venueId: row.venueId,
      label: row.label,
      token: row.token,
      url: `${config.publicWebUrl}/v/${slug}?t=${row.token}`,
      scans: row.scans,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async function loadQrWithVenue(id: string) {
    const [row] = await db
      .select({ qr: qrCodes, venue: venues })
      .from(qrCodes)
      .innerJoin(venues, eq(venues.id, qrCodes.venueId))
      .where(and(eq(qrCodes.id, id), isNull(venues.deletedAt)))
      .limit(1);
    if (!row) throw notFound("QR code not found");
    return row;
  }

  registerAdminRoute(app, routes.adminQrList, async ({ params, user }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    const rows = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.venueId, venue.id))
      .orderBy(asc(qrCodes.createdAt), asc(qrCodes.id));
    return { codes: rows.map((row) => toQrCode(row, venue.slug)) };
  });

  registerAdminRoute(app, routes.adminQrCreate, async ({ params, body, user, reply }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    for (let attempt = 0; attempt < tokenAttempts; attempt += 1) {
      try {
        const created = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(qrCodes)
            .values({
              id: newId("qr"),
              venueId: venue.id,
              label: body.label,
              token: randomUrlToken(tokenLength),
            })
            .returning();
          if (!row) throw notFound();
          await recordAudit(tx, {
            organizationId: venue.organizationId,
            actorUserId: user.id,
            action: "qr.create",
            target: row.id,
            meta: { venueId: venue.id, label: row.label },
          });
          return row;
        });
        reply.code(201);
        return toQrCode(created, venue.slug);
      } catch (error) {
        if (!isUniqueViolation(error, "qr_codes_token_unique")) throw error;
      }
    }
    throw new Error("Could not allocate a unique QR token");
  });

  registerAdminRoute(app, routes.adminQrUpdate, async ({ params, body, user }) => {
    const { qr, venue } = await loadQrWithVenue(params.id);
    assertOrgAccess(user, venue.organizationId, adminRoles);
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(qrCodes)
        .set({ label: body.label, active: body.active })
        .where(eq(qrCodes.id, qr.id))
        .returning();
      await recordAudit(tx, {
        organizationId: venue.organizationId,
        actorUserId: user.id,
        action: "qr.update",
        target: qr.id,
        meta: { venueId: venue.id, label: body.label, active: body.active },
      });
      return row;
    });
    if (!updated) throw notFound("QR code not found");
    return toQrCode(updated, venue.slug);
  });

  registerAdminRoute(app, routes.adminQrDelete, async ({ params, user }) => {
    const { qr, venue } = await loadQrWithVenue(params.id);
    assertOrgAccess(user, venue.organizationId, adminRoles);
    await db.transaction(async (tx) => {
      await tx.delete(qrCodes).where(eq(qrCodes.id, qr.id));
      await recordAudit(tx, {
        organizationId: venue.organizationId,
        actorUserId: user.id,
        action: "qr.delete",
        target: qr.id,
        meta: { venueId: venue.id, label: qr.label },
      });
    });
    return { ok: true as const };
  });
};
