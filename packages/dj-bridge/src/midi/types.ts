export type MidiMessageType = "noteOn" | "cc";

export interface MidiMatch {
  type: MidiMessageType;
  channel: number;
  number: number;
}

export type ConsoleAction =
  | { type: "acceptTop" }
  | { type: "declineTop" }
  | { type: "playNext" }
  | { type: "markPlayed" }
  | { type: "toggleRequestsOpen" }
  | { type: "moveSelection"; delta: 1 | -1 }
  | { type: "pushToAir" };

export interface MidiLed {
  type: MidiMessageType;
  channel: number;
  number: number;
  onValue?: number;
  offValue?: number;
}

export interface MidiBinding {
  match: MidiMatch;
  action: ConsoleAction;
  relative?: boolean;
  led?: MidiLed | null;
}

export interface ParsedMidiMessage {
  kind: "noteOn" | "noteOff" | "cc" | "other";
  channel: number;
  number: number;
  value: number;
}

export interface QueueLedState {
  pending: number;
  queued: number;
  playing: boolean;
  requestsOpen: boolean;
}

export interface MidiPreset {
  id: string;
  name: string;
  deviceMatch: RegExp;
  verified: boolean;
  notes: string;
  bindings: readonly MidiBinding[];
}

export interface MidiPortLike {
  id: string;
  name: string | null;
  manufacturer?: string | null;
  state: string;
}

type MessageHandler = {
  bivarianceHack(event: { data: Uint8Array | null }): void;
}["bivarianceHack"];
type StateHandler = {
  bivarianceHack(event: { port: MidiPortLike | null }): void;
}["bivarianceHack"];

export interface MidiInputLike extends MidiPortLike {
  onmidimessage: MessageHandler | null;
}

export interface MidiOutputLike extends MidiPortLike {
  send(data: number[] | Uint8Array): void;
}

export interface MidiPortMapLike<T> {
  forEach(callback: (port: T) => void): void;
}

export interface MidiAccessLike {
  inputs: MidiPortMapLike<MidiInputLike>;
  outputs: MidiPortMapLike<MidiOutputLike>;
  onstatechange: StateHandler | null;
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  direction: "input" | "output";
  connected: boolean;
}

export interface ConsoleActionEvent {
  action: ConsoleAction;
  binding: MidiBinding;
  deviceId: string;
  value: number;
}

export interface BindingStorage {
  load(): Promise<string | null>;
  save(json: string): Promise<void>;
}
