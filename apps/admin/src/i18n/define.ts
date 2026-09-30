import type { Locale } from "@joymusic/shared";

export type Message = Record<Locale, string>;

export function defineMessages<const T extends Record<string, Message>>(messages: T): T {
  return messages;
}
