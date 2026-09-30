import type { AuditEntry } from "@joymusic/shared";
import type { MessageKey } from "../i18n/messages";
import type { Translate } from "../i18n/translate";

export type AuditGroup = "venue" | "qr" | "member" | "moderation" | "organization" | "other";

export interface AuditDescription {
  group: AuditGroup;
  key: MessageKey;
  params: Record<string, string | number>;
}

function text(value: unknown, fallback = "–"): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export const auditGroups: readonly AuditGroup[] = [
  "venue",
  "qr",
  "member",
  "moderation",
  "organization",
  "other",
];

export function groupOfAction(action: string): AuditGroup {
  const prefix = action.split(".")[0];
  switch (prefix) {
    case "venue":
      return "venue";
    case "qr":
      return "qr";
    case "member":
      return "member";
    case "banned_word":
    case "device":
      return "moderation";
    case "organization":
      return "organization";
    default:
      return "other";
  }
}

export function describeAudit(
  entry: Pick<AuditEntry, "action" | "meta" | "target">,
): AuditDescription {
  const meta = entry.meta;
  const group = groupOfAction(entry.action);
  switch (entry.action) {
    case "venue.create":
      return {
        group,
        key: "audit.venue.create",
        params: { name: text(meta.name), slug: text(meta.slug) },
      };
    case "venue.update": {
      const fields = Array.isArray(meta.fields) ? meta.fields.map(String).join(", ") : "–";
      return { group, key: "audit.venue.update", params: { fields } };
    }
    case "venue.delete":
      return { group, key: "audit.venue.delete", params: { name: text(meta.name) } };
    case "qr.create":
      return { group, key: "audit.qr.create", params: { label: text(meta.label) } };
    case "qr.update": {
      if (typeof meta.active === "boolean" && meta.label === undefined) {
        return {
          group,
          key: meta.active ? "audit.qr.enable" : "audit.qr.disable",
          params: { label: text(meta.label, text(entry.target)) },
        };
      }
      return {
        group,
        key: "audit.qr.update",
        params: { label: text(meta.label, text(entry.target)) },
      };
    }
    case "qr.delete":
      return { group, key: "audit.qr.delete", params: { label: text(meta.label) } };
    case "member.invite":
      return {
        group,
        key: "audit.member.invite",
        params: { email: text(meta.email), role: text(meta.role) },
      };
    case "member.invite_revoke":
      return { group, key: "audit.member.inviteRevoke", params: { email: text(meta.email) } };
    case "member.join":
      return { group, key: "audit.member.join", params: { role: text(meta.role) } };
    case "member.role_update":
      return {
        group,
        key: "audit.member.roleUpdate",
        params: { email: text(meta.email), from: text(meta.from), to: text(meta.to) },
      };
    case "member.remove":
      return { group, key: "audit.member.remove", params: { email: text(meta.email) } };
    case "banned_word.add":
      return { group, key: "audit.word.add", params: { word: text(meta.word) } };
    case "banned_word.remove":
      return { group, key: "audit.word.remove", params: { word: text(meta.word) } };
    case "device.ban":
      return { group, key: "audit.device.ban", params: { device: text(entry.target) } };
    case "organization.create":
      return { group, key: "audit.organization.create", params: { name: text(meta.name, "") } };
    default:
      return { group, key: "audit.unknown", params: { action: entry.action } };
  }
}

export interface AuditFilter {
  query: string;
  group: AuditGroup | "all";
  actor: string | "all";
}

export function filterAudit(
  entries: readonly AuditEntry[],
  filter: AuditFilter,
  render: (entry: AuditEntry) => string,
): AuditEntry[] {
  const query = filter.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.group !== "all" && groupOfAction(entry.action) !== filter.group) return false;
    if (filter.actor !== "all" && entry.actorName !== filter.actor) return false;
    if (!query) return true;
    return (
      render(entry).toLowerCase().includes(query) ||
      entry.actorName.toLowerCase().includes(query) ||
      entry.action.includes(query)
    );
  });
}

const fieldKeys: Record<string, MessageKey> = {
  name: "audit.field.name",
  city: "audit.field.city",
  address: "audit.field.address",
  theme: "audit.field.theme",
  timezone: "audit.field.timezone",
  logoUrl: "audit.field.logoUrl",
  coverUrl: "audit.field.coverUrl",
  settings: "audit.field.settings",
};

export function renderAudit(
  t: Translate,
  entry: Pick<AuditEntry, "action" | "meta" | "target">,
): string {
  const description = describeAudit(entry);
  if (entry.action === "venue.update" && Array.isArray(entry.meta.fields)) {
    const fields = entry.meta.fields
      .map((field) => {
        const key = fieldKeys[String(field)];
        return key ? t(key) : String(field);
      })
      .join(", ");
    return t(description.key, { ...description.params, fields });
  }
  return t(description.key, description.params);
}
