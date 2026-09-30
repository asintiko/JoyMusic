import type { ConsoleAction } from "@joymusic/dj-bridge/midi";

export type ConsoleIntent =
  | { type: "accept" }
  | { type: "decline" }
  | { type: "declineNow" }
  | { type: "later" }
  | { type: "playNext" }
  | { type: "playSelected" }
  | { type: "markPlayed" }
  | { type: "toggleRequests" }
  | { type: "moveIncoming"; delta: 1 | -1 }
  | { type: "moveQueue"; delta: 1 | -1 }
  | { type: "reorderQueue"; delta: 1 | -1 };

export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function intentForKey(event: KeyLike): ConsoleIntent | null {
  if (event.metaKey || event.ctrlKey) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === "ArrowDown" || key === "ArrowUp") {
    const delta = key === "ArrowDown" ? 1 : -1;
    if (event.altKey) return { type: "reorderQueue", delta };
    if (event.shiftKey) return { type: "moveQueue", delta };
    return { type: "moveIncoming", delta };
  }
  if (event.altKey || event.shiftKey) return null;
  switch (key) {
    case "a":
      return { type: "accept" };
    case "d":
      return { type: "decline" };
    case "l":
      return { type: "later" };
    case " ":
      return { type: "playNext" };
    case "p":
      return { type: "markPlayed" };
    case "Enter":
      return { type: "playSelected" };
    default:
      return null;
  }
}

export function intentForMidi(action: ConsoleAction): ConsoleIntent {
  switch (action.type) {
    case "acceptTop":
      return { type: "accept" };
    case "declineTop":
      return { type: "declineNow" };
    case "playNext":
      return { type: "playNext" };
    case "markPlayed":
      return { type: "markPlayed" };
    case "toggleRequestsOpen":
      return { type: "toggleRequests" };
    case "moveSelection":
      return { type: "moveIncoming", delta: action.delta };
    case "pushToAir":
      return { type: "playSelected" };
  }
}
