import type * as Shared from "@joymusic/shared";

let pending: Promise<typeof Shared> | null = null;

export function loadShared(): Promise<typeof Shared> {
  pending ??= import("@joymusic/shared");
  return pending;
}
