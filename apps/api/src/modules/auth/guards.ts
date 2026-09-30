import type { FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { and, asc, eq, isNull } from "drizzle-orm";
import { memberRoles, type MemberRole } from "@joymusic/shared";
import type { Database } from "../../db/client";
import { memberships, organizations, users, venues } from "../../db/schema";
import { forbidden, notFound, unauthorized } from "../../errors";
import type { AuthUser, GuestContext, OrgContext } from "../../http/context";
import type { Deps } from "../../deps";

export const adminRoles: readonly MemberRole[] = ["owner", "admin"];
export const anyRole: readonly MemberRole[] = memberRoles;

const rolePriority: Record<MemberRole, number> = { owner: 0, admin: 1, dj: 2 };
const organizationHeader = "x-organization-id";

function bearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  const match = typeof header === "string" ? /^Bearer\s+(\S+)$/i.exec(header) : null;
  if (!match?.[1]) throw unauthorized("Missing or malformed Authorization header");
  return match[1];
}

export async function loadAuthUser(db: Database, userId: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      user: users,
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      role: memberships.role,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userId, users.id))
    .leftJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(users.id, userId))
    .orderBy(asc(memberships.createdAt));
  const first = rows[0];
  if (!first) return null;
  const membershipList = rows
    .flatMap((row) =>
      row.organizationId && row.organizationName && row.role
        ? [
            {
              organizationId: row.organizationId,
              organizationName: row.organizationName,
              role: row.role,
            },
          ]
        : [],
    )
    .sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
  return {
    id: first.user.id,
    email: first.user.email,
    name: first.user.name,
    avatarUrl: first.user.avatarUrl,
    locale: first.user.locale,
    isPlatformAdmin: first.user.isPlatformAdmin,
    memberships: membershipList,
  };
}

async function authenticateUser(deps: Deps, request: FastifyRequest): Promise<AuthUser> {
  const { userId } = await deps.tokens.verifyAccessToken(bearerToken(request));
  const user = await loadAuthUser(deps.db, userId);
  if (!user) throw unauthorized("Account no longer exists");
  return user;
}

export const requireUser: preHandlerAsyncHookHandler = async (request) => {
  request.user = await authenticateUser(request.server.deps, request);
};

export const requireGuest: preHandlerAsyncHookHandler = async (request) => {
  const claims = await request.server.deps.tokens.verifyGuestToken(bearerToken(request));
  request.guest = { deviceId: claims.deviceId, venueId: claims.venueId } satisfies GuestContext;
};

export function requireRole(roles: readonly MemberRole[]): preHandlerAsyncHookHandler {
  return async (request) => {
    const deps = request.server.deps;
    const user = request.user ?? (await authenticateUser(deps, request));
    request.user = user;
    request.org = await resolveOrgContext(deps, user, request, roles);
  };
}

export function assertOrgAccess(
  user: AuthUser,
  organizationId: string,
  allowed: readonly MemberRole[],
): OrgContext {
  const membership = user.memberships.find((entry) => entry.organizationId === organizationId);
  if (user.isPlatformAdmin) return { organizationId, role: membership?.role ?? "owner" };
  if (!membership) throw notFound();
  if (!allowed.includes(membership.role)) throw forbidden();
  return { organizationId, role: membership.role };
}

export async function resolveOrgContext(
  deps: Deps,
  user: AuthUser,
  request: FastifyRequest,
  allowed: readonly MemberRole[],
): Promise<OrgContext> {
  const requested = request.headers[organizationHeader];
  if (typeof requested === "string" && requested.length > 0) {
    const membership = user.memberships.find((entry) => entry.organizationId === requested);
    if (user.isPlatformAdmin) {
      const [organization] = await deps.db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, requested))
        .limit(1);
      if (!organization) throw notFound("Organization not found");
      return { organizationId: requested, role: membership?.role ?? "owner" };
    }
    if (!membership) throw forbidden("You are not a member of this organization");
    if (!allowed.includes(membership.role)) throw forbidden();
    return { organizationId: requested, role: membership.role };
  }
  const eligible = user.memberships.find((entry) => allowed.includes(entry.role));
  if (eligible) return { organizationId: eligible.organizationId, role: eligible.role };
  if (user.isPlatformAdmin) {
    throw forbidden(`Organization context required: send the ${organizationHeader} header`);
  }
  throw forbidden();
}

export async function assertVenueAccess(
  deps: Deps,
  user: AuthUser,
  venueId: string,
  allowed: readonly MemberRole[],
): Promise<typeof venues.$inferSelect> {
  const [venue] = await deps.db
    .select()
    .from(venues)
    .where(and(eq(venues.id, venueId), isNull(venues.deletedAt)))
    .limit(1);
  if (!venue) throw notFound("Venue not found");
  assertOrgAccess(user, venue.organizationId, allowed);
  return venue;
}
