import type { Me } from "@joymusic/shared";
import { describe, expect, it } from "vitest";
import {
  bestMembership,
  can,
  canChangeMember,
  capabilitiesOf,
  isDjOnly,
  pickActiveOrganization,
  safeRedirect,
} from "../src/lib/permissions";

const me = (roles: Array<["owner" | "admin" | "dj", string]>): Me => ({
  user: { id: "u", email: "a@b.co", name: "A", avatarUrl: null, locale: "en" },
  memberships: roles.map(([role, id]) => ({ organizationId: id, organizationName: id, role })),
  isPlatformAdmin: false,
});

describe("permission matrix", () => {
  it("gives owners and admins the panel and denies DJs", () => {
    expect(can("owner", "use-admin-panel")).toBe(true);
    expect(can("admin", "use-admin-panel")).toBe(true);
    expect(can("dj", "use-admin-panel")).toBe(false);
    expect(can(null, "manage-venues")).toBe(false);
  });

  it("keeps owner management for owners", () => {
    expect(can("owner", "manage-owners")).toBe(true);
    expect(can("admin", "manage-owners")).toBe(false);
  });

  it("lists capabilities per role", () => {
    expect(capabilitiesOf("dj")).toEqual([]);
    expect(capabilitiesOf("admin")).not.toContain("manage-owners");
    expect(capabilitiesOf("owner")).toContain("manage-owners");
  });
});

describe("canChangeMember", () => {
  it("lets owners change anyone", () => {
    expect(canChangeMember("owner", { role: "owner" }, "admin")).toBe(true);
  });
  it("stops admins from touching owners or granting ownership", () => {
    expect(canChangeMember("admin", { role: "owner" }, "admin")).toBe(false);
    expect(canChangeMember("admin", { role: "dj" }, "owner")).toBe(false);
    expect(canChangeMember("admin", { role: "dj" }, "admin")).toBe(true);
  });
  it("denies DJs", () => {
    expect(canChangeMember("dj", { role: "dj" }, "dj")).toBe(false);
  });
});

describe("organization selection", () => {
  it("prefers the stored organization when the user still belongs to it", () => {
    const profile = me([
      ["owner", "org_a"],
      ["dj", "org_b"],
    ]);
    expect(pickActiveOrganization(profile, "org_b")).toBe("org_b");
    expect(pickActiveOrganization(profile, "org_gone")).toBe("org_a");
    expect(bestMembership(profile)?.role).toBe("owner");
  });
  it("detects DJ-only accounts", () => {
    expect(isDjOnly(me([["dj", "org_a"]]))).toBe(true);
    expect(
      isDjOnly(
        me([
          ["dj", "org_a"],
          ["admin", "org_b"],
        ]),
      ),
    ).toBe(false);
    expect(isDjOnly(me([]))).toBe(false);
  });
});

describe("safeRedirect", () => {
  it("only allows same-origin paths", () => {
    expect(safeRedirect("/venues?x=1")).toBe("/venues?x=1");
    expect(safeRedirect("https://evil.example")).toBe("/");
    expect(safeRedirect("//evil.example")).toBe("/");
    expect(safeRedirect("/\\evil")).toBe("/");
    expect(safeRedirect(undefined)).toBe("/");
  });
});
