import type { ConsoleAction, MidiBinding, MidiMatch, ParsedMidiMessage } from "./types";

export function actionKey(action: ConsoleAction): string {
  return action.type === "moveSelection" ? `moveSelection:${action.delta}` : action.type;
}

export function matchKey(match: MidiMatch): string {
  return `${match.type}:${match.channel}:${match.number}`;
}

export function parseMidiMessage(data: ArrayLike<number> | null): ParsedMidiMessage | null {
  if (data === null || data.length < 2) return null;
  const status = (data[0] as number) & 0xff;
  const first = (data[1] as number) & 0x7f;
  const second = data.length > 2 ? (data[2] as number) & 0x7f : 0;
  if (status < 0x80 || status >= 0xf0) return null;
  const channel = (status & 0x0f) + 1;
  const command = status & 0xf0;
  if (command === 0x90) {
    return second === 0
      ? { kind: "noteOff", channel, number: first, value: 0 }
      : { kind: "noteOn", channel, number: first, value: second };
  }
  if (command === 0x80) return { kind: "noteOff", channel, number: first, value: second };
  if (command === 0xb0) return { kind: "cc", channel, number: first, value: second };
  return { kind: "other", channel, number: first, value: second };
}

export function relativeDelta(value: number): 1 | -1 | null {
  if (value >= 1 && value <= 63) return 1;
  if (value >= 65 && value <= 127) return -1;
  return null;
}

export function resolveTrigger(
  binding: MidiBinding,
  message: ParsedMidiMessage,
): ConsoleAction | null {
  if (binding.relative) {
    const delta = relativeDelta(message.value);
    if (delta === null) return null;
    if (binding.action.type === "moveSelection") return { type: "moveSelection", delta };
    return delta === 1 ? binding.action : null;
  }
  if (message.kind === "cc" && message.value === 0) return null;
  return binding.action;
}

export function isValidMatch(value: unknown): value is MidiMatch {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.type === "noteOn" || candidate.type === "cc") &&
    Number.isInteger(candidate.channel) &&
    (candidate.channel as number) >= 1 &&
    (candidate.channel as number) <= 16 &&
    Number.isInteger(candidate.number) &&
    (candidate.number as number) >= 0 &&
    (candidate.number as number) <= 127
  );
}

export function isValidAction(value: unknown): value is ConsoleAction {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  switch (candidate.type) {
    case "acceptTop":
    case "declineTop":
    case "playNext":
    case "markPlayed":
    case "toggleRequestsOpen":
    case "pushToAir":
      return true;
    case "moveSelection":
      return candidate.delta === 1 || candidate.delta === -1;
    default:
      return false;
  }
}
