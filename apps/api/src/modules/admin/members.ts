import type { FastifyPluginAsync } from "fastify";
import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import { routes, type Member, type MemberRole } from "@joymusic/shared";
import type { Executor, Transaction } from "../../db/client";
import { invites, memberships, organizations, users } from "../../db/schema";
import { conflict, forbidden, notFound } from "../../errors";
import { registerAdminRoute } from "../../http/register-route";
import { newId, randomSecret, sha256Hex } from "../../lib/ids";
import { recordAudit } from "../audit/service";
import { adminRoles, assertOrgAccess } from "../auth/guards";
import { normalizeEmail } from "../auth/service";

const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

interface MemberTarget {
  kind: "membership" | "invite";
  id: string;
  organizationId: string;
  role: MemberRole;
  userId: string | null;
  email: string;
  name: string | null;
  createdAt: Date;
}

function toMember(target: MemberTarget): Member {
  return {
    id: target.id,
    userId: target.userId,
    email: target.email,
    name: target.name,
    role: target.role,
    status: target.kind === "membership" ? "active" : "invited",
    createdAt: target.createdAt.toISOString(),
  };
}

async function findMemberTarget(executor: Executor, id: string): Promise<MemberTarget | null> {
  const [membership] = await executor
    .select({ membership: memberships, user: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.id, id))
    .limit(1);
  if (membership) {
    return {
      kind: "membership",
      id: membership.membership.id,
      organizationId: membership.membership.organizationId,
      role: membership.membership.role,
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      createdAt: membership.membership.createdAt,
    };
  }
  const [invite] = await executor
    .select()
    .from(invites)
    .where(and(eq(invites.id, id), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  if (!invite) return null;
  return {
    kind: "invite",
    id: invite.id,
    organizationId: invite.organizationId,
    role: invite.role,
    userId: null,
    email: invite.email,
    name: null,
    createdAt: invite.createdAt,
  };
}

async function lockOrganization(tx: Transaction, organizationId: string): Promise<void> {
  await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .for("update");
}

async function countOwners(tx: Transaction, organizationId: string): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "owner")));
  return row?.total ?? 0;
}

function assertCanTouchOwners(actorRole: MemberRole, roles: readonly MemberRole[]): void {
  if (roles.includes("owner") && actorRole !== "owner") {
    throw forbidden("Only owners can manage owners");
  }
}

export const adminMemberRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminMembers, async ({ org }) => {
    const active = await db
      .select({ membership: memberships, user: users })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, org.organizationId))
      .orderBy(asc(memberships.createdAt), asc(memberships.id));
    const pending = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.organizationId, org.organizationId),
          isNull(invites.acceptedAt),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .orderBy(asc(invites.createdAt), asc(invites.id));
    const members: Member[] = [
      ...active.map((row) =>
        toMember({
          kind: "membership",
          id: row.membership.id,
          organizationId: row.membership.organizationId,
          role: row.membership.role,
          userId: row.user.id,
          email: row.user.email,
          name: row.user.name,
          createdAt: row.membership.createdAt,
        }),
      ),
      ...pending.map((invite) =>
        toMember({
          kind: "invite",
          id: invite.id,
          organizationId: invite.organizationId,
          role: invite.role,
          userId: null,
          email: invite.email,
          name: null,
          createdAt: invite.createdAt,
        }),
      ),
    ];
    return { members };
  });

  registerAdminRoute(app, routes.adminMemberInvite, async ({ body, org, user, reply }) => {
    assertCanTouchOwners(org.role, [body.role]);
    const email = normalizeEmail(body.email);
    const [existing] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.organizationId, org.organizationId), eq(users.email, email)))
      .limit(1);
    if (existing) throw conflict("This user is already a member of the organization");
    const inviteToken = randomSecret(32);
    const inviteId = newId("inv");
    const invite = await db.transaction(async (tx) => {
      await tx
        .delete(invites)
        .where(
          and(
            eq(invites.organizationId, org.organizationId),
            eq(invites.email, email),
            isNull(invites.acceptedAt),
          ),
        );
      const [row] = await tx
        .insert(invites)
        .values({
          id: inviteId,
          organizationId: org.organizationId,
          email,
          role: body.role,
          tokenHash: sha256Hex(inviteToken),
          expiresAt: new Date(Date.now() + inviteTtlMs),
          invitedBy: user.id,
        })
        .returning();
      await recordAudit(tx, {
        organizationId: org.organizationId,
        actorUserId: user.id,
        action: "member.invite",
        target: inviteId,
        meta: { email, role: body.role },
      });
      return row;
    });
    if (!invite) throw notFound();
    reply.code(201);
    return {
      member: toMember({
        kind: "invite",
        id: invite.id,
        organizationId: invite.organizationId,
        role: invite.role,
        userId: null,
        email: invite.email,
        name: null,
        createdAt: invite.createdAt,
      }),
      inviteToken,
    };
  });

  registerAdminRoute(app, routes.adminMemberUpdate, async ({ params, body, user }) => {
    const found = await findMemberTarget(db, params.id);
    if (!found) throw notFound("Member not found");
    const context = assertOrgAccess(user, found.organizationId, adminRoles);
    assertCanTouchOwners(context.role, [found.role, body.role]);
    const updated = await db.transaction(async (tx) => {
      await lockOrganization(tx, found.organizationId);
      const target = await findMemberTarget(tx, params.id);
      if (!target) throw notFound("Member not found");
      if (
        target.kind === "membership" &&
        target.role === "owner" &&
        body.role !== "owner" &&
        (await countOwners(tx, target.organizationId)) <= 1
      ) {
        throw conflict("Cannot demote the last owner of the organization");
      }
      if (target.kind === "membership") {
        await tx.update(memberships).set({ role: body.role }).where(eq(memberships.id, target.id));
      } else {
        await tx.update(invites).set({ role: body.role }).where(eq(invites.id, target.id));
      }
      await recordAudit(tx, {
        organizationId: target.organizationId,
        actorUserId: user.id,
        action: "member.role_update",
        target: target.id,
        meta: { email: target.email, from: target.role, to: body.role, status: target.kind },
      });
      return { ...target, role: body.role };
    });
    return toMember(updated);
  });

  registerAdminRoute(app, routes.adminMemberDelete, async ({ params, user }) => {
    const found = await findMemberTarget(db, params.id);
    if (!found) throw notFound("Member not found");
    const context = assertOrgAccess(user, found.organizationId, adminRoles);
    assertCanTouchOwners(context.role, [found.role]);
    await db.transaction(async (tx) => {
      await lockOrganization(tx, found.organizationId);
      const target = await findMemberTarget(tx, params.id);
      if (!target) throw notFound("Member not found");
      if (
        target.kind === "membership" &&
        target.role === "owner" &&
        (await countOwners(tx, target.organizationId)) <= 1
      ) {
        throw conflict("Cannot remove the last owner of the organization");
      }
      if (target.kind === "membership") {
        await tx.delete(memberships).where(eq(memberships.id, target.id));
      } else {
        await tx.delete(invites).where(eq(invites.id, target.id));
      }
      await recordAudit(tx, {
        organizationId: target.organizationId,
        actorUserId: user.id,
        action: target.kind === "membership" ? "member.remove" : "member.invite_revoke",
        target: target.id,
        meta: { email: target.email, role: target.role },
      });
    });
    return { ok: true as const };
  });
};
