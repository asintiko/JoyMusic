import type { Me, MemberRole, Membership } from "@joymusic/shared";

export type Capability =
  | "manage-venues"
  | "manage-qr"
  | "manage-members"
  | "manage-owners"
  | "manage-moderation"
  | "view-analytics"
  | "view-audit"
  | "delete-venue"
  | "use-admin-panel";

const matrix: Record<Capability, readonly MemberRole[]> = {
  "use-admin-panel": ["owner", "admin"],
  "manage-venues": ["owner", "admin"],
  "manage-qr": ["owner", "admin"],
  "manage-members": ["owner", "admin"],
  "manage-owners": ["owner"],
  "manage-moderation": ["owner", "admin"],
  "view-analytics": ["owner", "admin"],
  "view-audit": ["owner", "admin"],
  "delete-venue": ["owner", "admin"],
};

export const roleRank: Record<MemberRole, number> = { owner: 0, admin: 1, dj: 2 };

export function can(role: MemberRole | null | undefined, capability: Capability): boolean {
  return role ? matrix[capability].includes(role) : false;
}

export function capabilitiesOf(role: MemberRole | null | undefined): Capability[] {
  return (Object.keys(matrix) as Capability[]).filter((capability) => can(role, capability));
}

export function membershipFor(me: Me | null, organizationId: string | null): Membership | null {
  if (!me) return null;
  return me.memberships.find((entry) => entry.organizationId === organizationId) ?? null;
}

export function bestMembership(me: Me): Membership | null {
  const sorted = [...me.memberships].sort((a, b) => roleRank[a.role] - roleRank[b.role]);
  return sorted[0] ?? null;
}

export function pickActiveOrganization(me: Me, preferred: string | null): string | null {
  if (preferred && me.memberships.some((entry) => entry.organizationId === preferred)) {
    return preferred;
  }
  return bestMembership(me)?.organizationId ?? null;
}

export function isDjOnly(me: Me | null): boolean {
  if (!me || me.memberships.length === 0) return false;
  return me.memberships.every((entry) => entry.role === "dj");
}

export function canChangeMember(
  actorRole: MemberRole | null,
  target: { role: MemberRole },
  nextRole?: MemberRole,
): boolean {
  if (!can(actorRole, "manage-members")) return false;
  if (actorRole === "owner") return true;
  if (target.role === "owner") return false;
  return nextRole !== "owner";
}

export function safeRedirect(target: string | null | undefined): string {
  if (!target) return "/";
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return "/";
  return target;
}
