export function inviteLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/invite/${encodeURIComponent(token)}`;
}

export function desktopCallbackUrl(code: string, state: string): string {
  const search = new URLSearchParams({ code, state });
  return `joymusic://auth?${search.toString()}`;
}
