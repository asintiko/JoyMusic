import { useSyncExternalStore } from "react";
import { session } from "./api";
import type { SessionSnapshot } from "./session";

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}

export function useOrganizationId(): string {
  return useSession().activeOrganizationId ?? "none";
}
