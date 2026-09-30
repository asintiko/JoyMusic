import type { Locale, MemberRole } from "@joymusic/shared";
import type { Deps } from "../deps";

export interface AuthMembership {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: Locale;
  isPlatformAdmin: boolean;
  memberships: AuthMembership[];
}

export interface GuestContext {
  deviceId: string;
  venueId: string;
}

export interface OrgContext {
  organizationId: string;
  role: MemberRole;
}

declare module "fastify" {
  interface FastifyInstance {
    deps: Deps;
  }
  interface FastifyRequest {
    user: AuthUser | null;
    guest: GuestContext | null;
    org: OrgContext | null;
  }
}
