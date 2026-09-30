import { and, eq } from "drizzle-orm";
import type { AdminVenue, AuthResult, MemberRole } from "@joymusic/shared";
import { djSessions, users } from "../../src/db/schema";
import { newId } from "../../src/lib/ids";
import { createApi, type TestApi } from "./api";
import { uniq, type TestContext } from "./context";

export const testPassword = "correct-horse-battery";

export interface Actor {
  email: string;
  password: string;
  name: string;
  userId: string;
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  result: AuthResult;
}

export function apiOf(context: TestContext): TestApi {
  return createApi(context.app);
}

export async function registerOwner(
  context: TestContext,
  overrides: { email?: string; name?: string; organizationName?: string } = {},
): Promise<Actor> {
  const api = apiOf(context);
  const email = overrides.email ?? `${uniq("owner")}@example.com`;
  const name = overrides.name ?? "Owner Person";
  const result = await api.ok("authRegister", {
    body: {
      email,
      password: testPassword,
      name,
      organizationName: overrides.organizationName ?? `Org ${uniq()}`,
    },
  });
  const membership = result.me.memberships[0];
  if (!membership) throw new Error("registered user has no membership");
  return {
    email,
    password: testPassword,
    name,
    userId: result.me.user.id,
    organizationId: membership.organizationId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    result,
  };
}

export async function addMember(
  context: TestContext,
  owner: Actor,
  role: MemberRole,
  label = role,
): Promise<Actor> {
  const api = apiOf(context);
  const email = `${uniq(label)}@example.com`;
  const invited = await api.ok("adminMemberInvite", {
    token: owner.accessToken,
    body: { email, role },
  });
  const name = `${label} person`;
  const result = await api.ok("authInviteAccept", {
    body: { token: invited.inviteToken, name, password: testPassword },
  });
  return {
    email,
    password: testPassword,
    name,
    userId: result.me.user.id,
    organizationId: owner.organizationId,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    result,
  };
}

export async function createVenue(
  context: TestContext,
  actor: Actor,
  overrides: { slug?: string; name?: string } = {},
): Promise<AdminVenue> {
  return apiOf(context).ok("adminVenueCreate", {
    token: actor.accessToken,
    body: {
      name: overrides.name ?? "Test Venue",
      slug: overrides.slug ?? `venue-${uniq()}`,
      theme: "club",
      timezone: "Asia/Tashkent",
    },
  });
}

export async function startSession(
  context: TestContext,
  venueId: string,
  djUserId: string,
  startedAt = new Date(),
): Promise<string> {
  const id = newId("ses");
  await context.deps.db.insert(djSessions).values({ id, venueId, djUserId, startedAt });
  return id;
}

export async function makePlatformAdmin(context: TestContext, userId: string): Promise<void> {
  await context.deps.db.update(users).set({ isPlatformAdmin: true }).where(eq(users.id, userId));
}

export async function activeSessionOf(context: TestContext, venueId: string) {
  const [row] = await context.deps.db
    .select()
    .from(djSessions)
    .where(and(eq(djSessions.venueId, venueId)));
  return row;
}
