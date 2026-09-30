export const deepLinkScheme = "joymusic";

export type DeepLink =
  | { kind: "auth"; code: string; state: string }
  | { kind: "authError"; error: string; state: string | null };

const codePattern = /^[A-Za-z0-9._~-]{8,512}$/u;
const statePattern = /^[A-Za-z0-9._~-]{8,128}$/u;
const errorPattern = /^[a-z_]{1,64}$/u;

export function parseDeepLink(input: string): DeepLink | null {
  if (input.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== `${deepLinkScheme}:`) return null;
  if (url.hostname !== "auth") return null;
  if (url.pathname !== "" && url.pathname !== "/") return null;
  const state = url.searchParams.get("state");
  const validState = state !== null && statePattern.test(state) ? state : null;
  const error = url.searchParams.get("error");
  if (error !== null) {
    return {
      kind: "authError",
      error: errorPattern.test(error) ? error : "unknown",
      state: validState,
    };
  }
  const code = url.searchParams.get("code");
  if (code === null || !codePattern.test(code) || validState === null) return null;
  return { kind: "auth", code, state: validState };
}

export function findDeepLinkArgument(argv: readonly string[]): string | null {
  const prefix = `${deepLinkScheme}://`;
  return argv.find((entry) => entry.toLowerCase().startsWith(prefix)) ?? null;
}
