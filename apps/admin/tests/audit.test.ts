import { describe, expect, it } from "vitest";
import { describeAudit, filterAudit, groupOfAction, renderAudit } from "../src/lib/audit";
import { translate } from "../src/i18n/translate";

const entry = (
  action: string,
  meta: Record<string, unknown> = {},
  target: string | null = null,
) => ({
  id: action,
  actorName: "Owner",
  action,
  target,
  meta,
  createdAt: "2026-09-30T10:00:00.000Z",
});

describe("audit descriptions", () => {
  it("groups actions", () => {
    expect(groupOfAction("venue.create")).toBe("venue");
    expect(groupOfAction("banned_word.add")).toBe("moderation");
    expect(groupOfAction("device.ban")).toBe("moderation");
    expect(groupOfAction("member.role_update")).toBe("member");
    expect(groupOfAction("something.else")).toBe("other");
  });

  it("distinguishes QR toggles from renames", () => {
    expect(describeAudit(entry("qr.update", { active: false })).key).toBe("audit.qr.disable");
    expect(describeAudit(entry("qr.update", { active: true })).key).toBe("audit.qr.enable");
    expect(describeAudit(entry("qr.update", { label: "T1" })).key).toBe("audit.qr.update");
  });

  it("falls back for unknown actions", () => {
    const description = describeAudit(entry("mystery.action"));
    expect(description.key).toBe("audit.unknown");
    expect(description.params.action).toBe("mystery.action");
  });

  it("renders readable sentences in each language", () => {
    const item = entry("member.role_update", { email: "dj@x.uz", from: "admin", to: "dj" });
    const t =
      (locale: "en" | "ru" | "uz") =>
      (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
        translate(locale, key, params);
    expect(renderAudit(t("en"), item)).toBe("Changed role of dj@x.uz: admin to dj");
    expect(renderAudit(t("ru"), item)).toContain("dj@x.uz");
  });

  it("localizes venue update fields", () => {
    const item = entry("venue.update", { fields: ["theme", "settings"] });
    const text = renderAudit((key, params) => translate("ru", key, params), item);
    expect(text).toContain("тема");
    expect(text).toContain("правила заказов");
  });
});

describe("audit filtering", () => {
  const entries = [
    entry("venue.create", { name: "Nomad", slug: "nomad" }),
    entry("banned_word.add", { word: "jalab" }),
    { ...entry("qr.create", { label: "Table 1" }), actorName: "Aziza" },
  ];
  const render = (item: (typeof entries)[number]) =>
    renderAudit((key, params) => translate("en", key, params), item);

  it("filters by group, actor and text", () => {
    expect(
      filterAudit(entries, { query: "", group: "moderation", actor: "all" }, render),
    ).toHaveLength(1);
    expect(filterAudit(entries, { query: "", group: "all", actor: "Aziza" }, render)).toHaveLength(
      1,
    );
    expect(
      filterAudit(entries, { query: "nomad", group: "all", actor: "all" }, render),
    ).toHaveLength(1);
    expect(filterAudit(entries, { query: "", group: "all", actor: "all" }, render)).toHaveLength(3);
  });
});
