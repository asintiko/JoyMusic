import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { developmentEndpoints, normalizeUrl, resolveEndpoints } from "../../src/main/config";
import { chooseStageDisplay, describeDisplay } from "../../src/main/displays";
import { resolveAppFile, serveAppFile } from "../../src/main/protocol";
import {
  buildContentSecurityPolicy,
  isAllowedPermission,
  isAppUrl,
  isBlockedStageInput,
  isSafeExternalUrl,
} from "../../src/main/security";

describe("endpoint config", () => {
  const production = {
    apiUrl: "https://api.joymusic.uz",
    adminUrl: "https://admin.joymusic.uz",
    webUrl: "https://joymusic.uz",
  };

  it("uses the build defaults when nothing is set", () => {
    expect(resolveEndpoints({}, production)).toEqual(production);
    expect(resolveEndpoints({}, developmentEndpoints)).toEqual({
      apiUrl: "http://localhost:4000",
      adminUrl: "http://localhost:5173",
      webUrl: "http://localhost:3000",
    });
  });

  it("lets the environment override each url and strips trailing slashes", () => {
    expect(
      resolveEndpoints(
        { API_URL: "http://192.168.1.10:4000/", ADMIN_URL: "https://admin.example.com//" },
        production,
      ),
    ).toEqual({
      apiUrl: "http://192.168.1.10:4000",
      adminUrl: "https://admin.example.com",
      webUrl: "https://joymusic.uz",
    });
  });

  it("accepts the prefixed variable names and ignores garbage", () => {
    expect(resolveEndpoints({ JOYMUSIC_WEB_URL: "https://web.test" }, production).webUrl).toBe(
      "https://web.test",
    );
    expect(resolveEndpoints({ API_URL: "javascript:alert(1)" }, production).apiUrl).toBe(
      production.apiUrl,
    );
    expect(normalizeUrl("ftp://x")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("content security policy", () => {
  it("is strict in production: no eval, no remote scripts, no network from the page", () => {
    const policy = buildContentSecurityPolicy({ development: false });
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("img-src 'self' data: blob: https:");
  });

  it("only opens the dev server and eval in development", () => {
    const policy = buildContentSecurityPolicy({
      development: true,
      developmentOrigin: "http://localhost:5173",
    });
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("ws://localhost:5173");
  });
});

describe("navigation and permission rules", () => {
  it("recognises only the app origin and the dev server", () => {
    expect(isAppUrl("joy://app/index.html#/console", null)).toBe(true);
    expect(isAppUrl("joy://evil/index.html", null)).toBe(false);
    expect(isAppUrl("https://joymusic.uz", null)).toBe(false);
    expect(isAppUrl("http://localhost:5173/#/x", "http://localhost:5173")).toBe(true);
    expect(isAppUrl("http://localhost:5174/", "http://localhost:5173")).toBe(false);
    expect(isAppUrl("not a url", null)).toBe(false);
  });

  it("opens only http(s) links externally", () => {
    expect(isSafeExternalUrl("https://joymusic.uz/docs")).toBe(true);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("grants MIDI to the app and nothing else", () => {
    expect(isAllowedPermission("midi", "joy://app/index.html", null)).toBe(true);
    expect(isAllowedPermission("midiSysex", "joy://app/index.html", null)).toBe(false);
    expect(isAllowedPermission("media", "joy://app/index.html", null)).toBe(false);
    expect(isAllowedPermission("midi", "https://evil.example", null)).toBe(false);
  });

  it("blocks the shortcuts that could break out of the stage window", () => {
    const key = (
      name: string,
      extra: Partial<{ control: boolean; meta: boolean; shift: boolean; alt: boolean }> = {},
    ) => ({
      key: name,
      control: false,
      meta: false,
      shift: false,
      alt: false,
      ...extra,
    });
    expect(isBlockedStageInput(key("F11"))).toBe(true);
    expect(isBlockedStageInput(key("Escape"))).toBe(true);
    expect(isBlockedStageInput(key("w", { control: true }))).toBe(true);
    expect(isBlockedStageInput(key("w", { meta: true }))).toBe(true);
    expect(isBlockedStageInput(key("F12"))).toBe(true);
    expect(isBlockedStageInput(key("a"))).toBe(false);
  });
});

describe("app protocol", () => {
  it("maps urls to files inside the renderer root only", () => {
    const root = "/opt/app/out/renderer";
    expect(resolveAppFile(root, "joy://app/")).toBe(`${root}/index.html`);
    expect(resolveAppFile(root, "joy://app/assets/a.js")).toBe(`${root}/assets/a.js`);
    expect(resolveAppFile(root, "joy://app/../../etc/passwd")).toBe(`${root}/etc/passwd`);
    expect(resolveAppFile(root, "joy://app/%2e%2e/%2e%2e/etc/passwd")).toBe(`${root}/etc/passwd`);
    expect(resolveAppFile(root, "joy://app/a/..%2f..%2f..%2fetc")).toBeNull();
    expect(resolveAppFile(root, "joy://other/index.html")).toBeNull();
  });

  it("serves files with the right type and the security headers", async () => {
    const root = await mkdtemp(join(tmpdir(), "joy-app-"));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<h1>hi</h1>");
    await writeFile(join(root, "assets", "x.woff2"), "font");
    const html = await serveAppFile(root, "joy://app/index.html", {
      "content-security-policy": "default-src 'self'",
    });
    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(html.headers.get("content-security-policy")).toBe("default-src 'self'");
    expect(await html.text()).toBe("<h1>hi</h1>");
    const font = await serveAppFile(root, "joy://app/assets/x.woff2", {});
    expect(font.headers.get("content-type")).toBe("font/woff2");
    expect((await serveAppFile(root, "joy://app/missing.js", {})).status).toBe(404);
    expect((await serveAppFile(root, "joy://app/%2e%2e/secret", {})).status).toBe(404);
  });
});

describe("stage display choice", () => {
  const primary = { id: 1, label: "Built-in", size: { width: 1440, height: 900 }, scaleFactor: 2 };
  const tv = { id: 7, label: "", size: { width: 1920, height: 1080 }, scaleFactor: 1 };

  it("prefers the requested display, then the first external one", () => {
    expect(chooseStageDisplay([primary, tv], 1, 1)?.id).toBe(1);
    expect(chooseStageDisplay([primary, tv], 1, null)?.id).toBe(7);
    expect(chooseStageDisplay([primary, tv], 1, 99)?.id).toBe(7);
    expect(chooseStageDisplay([primary], 1, null)?.id).toBe(1);
    expect(chooseStageDisplay([], 1, null)).toBeNull();
  });

  it("describes displays in physical pixels with a fallback label", () => {
    expect(describeDisplay(primary, 1)).toMatchObject({ width: 2880, height: 1800, primary: true });
    expect(describeDisplay(tv, 1)).toMatchObject({ label: "Display 7", primary: false });
  });
});
