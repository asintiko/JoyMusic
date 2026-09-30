import { actionKey } from "./actions";
import type { MidiBinding, MidiLed, QueueLedState } from "./types";

export type LedMode = "on" | "off" | "blink";

export interface LedPlanItem {
  key: string;
  led: MidiLed;
  mode: LedMode;
}

function statusByte(led: MidiLed): number {
  return (led.type === "noteOn" ? 0x90 : 0xb0) | ((led.channel - 1) & 0x0f);
}

export function ledOn(led: MidiLed): number[] {
  return [statusByte(led), led.number & 0x7f, (led.onValue ?? 127) & 0x7f];
}

export function ledOff(led: MidiLed): number[] {
  return [statusByte(led), led.number & 0x7f, (led.offValue ?? 0) & 0x7f];
}

export interface BlinkOptions {
  intervalMs: number;
  every(ms: number, task: () => void): { cancel(): void };
}

export function blink(
  led: MidiLed,
  send: (message: number[]) => void,
  options: BlinkOptions,
): () => void {
  let lit = true;
  send(ledOn(led));
  const timer = options.every(options.intervalMs, () => {
    lit = !lit;
    send(lit ? ledOn(led) : ledOff(led));
  });
  return () => {
    timer.cancel();
    send(ledOff(led));
  };
}

export function ledFor(binding: MidiBinding): MidiLed | null {
  if (binding.led === null) return null;
  if (binding.led) return binding.led;
  if (binding.match.type !== "noteOn") return null;
  return { type: "noteOn", channel: binding.match.channel, number: binding.match.number };
}

function modeFor(binding: MidiBinding, state: QueueLedState): LedMode {
  switch (binding.action.type) {
    case "acceptTop":
      return state.pending > 0 ? "blink" : "off";
    case "declineTop":
      return state.pending > 0 ? "on" : "off";
    case "playNext":
    case "pushToAir":
      return state.queued > 0 ? "on" : "off";
    case "markPlayed":
      return state.playing ? "on" : "off";
    case "toggleRequestsOpen":
      return state.requestsOpen ? "on" : "off";
    case "moveSelection":
      return "off";
  }
}

export function planLeds(bindings: readonly MidiBinding[], state: QueueLedState): LedPlanItem[] {
  const items: LedPlanItem[] = [];
  for (const binding of bindings) {
    const led = ledFor(binding);
    if (led === null) continue;
    items.push({ key: actionKey(binding.action), led, mode: modeFor(binding, state) });
  }
  return items;
}
