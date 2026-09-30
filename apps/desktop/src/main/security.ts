export const appScheme = "joy";
export const appHost = "app";
export const appOrigin = `${appScheme}://${appHost}`;

export interface CspOptions {
  development: boolean;
  developmentOrigin?: string | null;
}

export function buildContentSecurityPolicy(options: CspOptions): string {
  const devOrigin = options.developmentOrigin ?? null;
  const devSocket = devOrigin ? devOrigin.replace(/^http/u, "ws") : null;
  const scripts = ["'self'"];
  const connect = ["'self'"];
  const images = ["'self'", "data:", "blob:", "https:"];
  if (options.development) {
    scripts.push("'unsafe-inline'", "'unsafe-eval'");
    if (devOrigin) connect.push(devOrigin);
    if (devSocket) connect.push(devSocket);
    images.push("http:");
  }
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'none'",
  ].join("; ");
}

export function isAppUrl(url: string, developmentOrigin: string | null): boolean {
  try {
    const parsed = new URL(url);
    if (
      parsed.origin === appOrigin ||
      (parsed.protocol === `${appScheme}:` && parsed.host === appHost)
    ) {
      return true;
    }
    return developmentOrigin !== null && parsed.origin === new URL(developmentOrigin).origin;
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isAllowedPermission(
  permission: string,
  requestingUrl: string,
  developmentOrigin: string | null,
): boolean {
  return permission === "midi" && isAppUrl(requestingUrl, developmentOrigin);
}

export const blockedShortcuts = [
  { key: "F11" },
  { key: "Escape" },
  { key: "w", control: true },
  { key: "w", meta: true },
  { key: "r", control: true },
  { key: "r", meta: true },
  { key: "F5" },
  { key: "F12" },
  { key: "i", control: true, shift: true },
  { key: "i", meta: true, alt: true },
] as const;

export interface KeyInput {
  key: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export function isBlockedStageInput(input: KeyInput): boolean {
  return blockedShortcuts.some((shortcut) => {
    if (input.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
    const expectedControl = "control" in shortcut ? shortcut.control : false;
    const expectedMeta = "meta" in shortcut ? shortcut.meta : false;
    const expectedShift = "shift" in shortcut ? shortcut.shift : false;
    const expectedAlt = "alt" in shortcut ? shortcut.alt : false;
    return (
      input.control === expectedControl &&
      input.meta === expectedMeta &&
      input.shift === expectedShift &&
      input.alt === expectedAlt
    );
  });
}
