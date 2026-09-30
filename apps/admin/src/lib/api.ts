import { env } from "./env";
import { browserLocks, createSession } from "./session";
import { browserStorage } from "./storage";

export const session = createSession({
  baseUrl: env.apiUrl,
  storage: browserStorage(),
  locks: browserLocks(),
});

export const api = session.api;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => session.handleStorageEvent(event));
}
