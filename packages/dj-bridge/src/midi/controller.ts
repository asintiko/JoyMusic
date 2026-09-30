import { createEmitter } from "../core/emitter";
import { systemTimers } from "../core/timers";
import type { Timers } from "../core/types";
import { actionKey, matchKey, parseMidiMessage, resolveTrigger } from "./actions";
import { blink, ledOff, ledOn, planLeds } from "./leds";
import { findPresetForDevice, midiPresets } from "./presets";
import { parseBindings, serializeBindings } from "./storage";
import type {
  BindingStorage,
  ConsoleAction,
  ConsoleActionEvent,
  MidiAccessLike,
  MidiBinding,
  MidiDeviceInfo,
  MidiInputLike,
  MidiOutputLike,
  MidiPreset,
  ParsedMidiMessage,
  QueueLedState,
} from "./types";

export interface MidiControllerOptions {
  access: MidiAccessLike;
  storage?: BindingStorage;
  timers?: Timers;
  blinkIntervalMs?: number;
  onError?: (error: unknown) => void;
}

export interface LearnOptions {
  timeoutMs?: number;
  relative?: boolean;
}

export interface MidiController {
  start(): void;
  stop(): void;
  devices(): MidiDeviceInfo[];
  bindings(): MidiBinding[];
  setBindings(bindings: readonly MidiBinding[]): void;
  removeBinding(action: ConsoleAction): void;
  applyPreset(id: string): MidiPreset;
  detectPreset(): MidiPreset | null;
  learn(action: ConsoleAction, options?: LearnOptions): Promise<MidiBinding>;
  cancelLearn(): void;
  isLearning(): boolean;
  load(): Promise<void>;
  save(): Promise<void>;
  setLedState(state: QueueLedState): void;
  clearLeds(): void;
  onAction(listener: (event: ConsoleActionEvent) => void): () => void;
  onDevicesChanged(listener: (devices: MidiDeviceInfo[]) => void): () => void;
}

interface Events extends Record<string, unknown> {
  action: ConsoleActionEvent;
  devices: MidiDeviceInfo[];
}

interface LearnRequest {
  action: ConsoleAction;
  relative: boolean | undefined;
  resolve(binding: MidiBinding): void;
  reject(error: Error): void;
  timer: { cancel(): void };
}

function collect<T>(map: { forEach(callback: (port: T) => void): void }): T[] {
  const ports: T[] = [];
  map.forEach((port) => ports.push(port));
  return ports;
}

export function createMidiController(options: MidiControllerOptions): MidiController {
  const { access } = options;
  const timers = options.timers ?? systemTimers;
  const blinkIntervalMs = options.blinkIntervalMs ?? 400;
  const emitter = createEmitter<Events>(options.onError);
  let current: MidiBinding[] = [];
  let started = false;
  let learning: LearnRequest | null = null;
  let stopBlinkers = new Map<string, () => void>();
  const attached = new Map<string, MidiInputLike>();

  const connectedInputs = () =>
    collect<MidiInputLike>(access.inputs).filter((port) => port.state !== "disconnected");
  const connectedOutputs = () =>
    collect<MidiOutputLike>(access.outputs).filter((port) => port.state !== "disconnected");

  const describe = (): MidiDeviceInfo[] => [
    ...collect<MidiInputLike>(access.inputs).map((port): MidiDeviceInfo => ({
      id: port.id,
      name: port.name ?? "",
      manufacturer: port.manufacturer ?? "",
      direction: "input",
      connected: port.state !== "disconnected",
    })),
    ...collect<MidiOutputLike>(access.outputs).map((port): MidiDeviceInfo => ({
      id: port.id,
      name: port.name ?? "",
      manufacturer: port.manufacturer ?? "",
      direction: "output",
      connected: port.state !== "disconnected",
    })),
  ];

  const outputsForLeds = (): MidiOutputLike[] => {
    const names = new Set(connectedInputs().map((port) => port.name));
    return connectedOutputs().filter((port) => names.has(port.name));
  };

  const send = (message: number[]) => {
    for (const output of outputsForLeds()) {
      try {
        output.send(message);
      } catch (error) {
        options.onError?.(error);
      }
    }
  };

  const finishLearn = (message: ParsedMidiMessage): boolean => {
    const request = learning;
    if (request === null) return false;
    if (message.kind !== "noteOn" && message.kind !== "cc") return false;
    if (message.kind === "cc" && message.value === 0) return false;
    learning = null;
    request.timer.cancel();
    const match = { type: message.kind, channel: message.channel, number: message.number };
    const relative =
      request.relative ?? (message.kind === "cc" && request.action.type === "moveSelection");
    const binding: MidiBinding = { match, action: request.action };
    if (relative) {
      binding.relative = true;
      binding.led = null;
    }
    const key = actionKey(request.action);
    current = current.filter(
      (existing) =>
        actionKey(existing.action) !== key && matchKey(existing.match) !== matchKey(match),
    );
    current.push(binding);
    request.resolve(binding);
    return true;
  };

  const handleMessage = (deviceId: string, data: Uint8Array | null) => {
    const message = parseMidiMessage(data);
    if (message === null) return;
    if (finishLearn(message)) return;
    if (message.kind !== "noteOn" && message.kind !== "cc") return;
    const key = matchKey({ type: message.kind, channel: message.channel, number: message.number });
    for (const binding of current) {
      if (matchKey(binding.match) !== key) continue;
      const action = resolveTrigger(binding, message);
      if (action === null) continue;
      emitter.emit("action", { action, binding, deviceId, value: message.value });
    }
  };

  const attachInputs = () => {
    const live = new Set<string>();
    for (const input of connectedInputs()) {
      live.add(input.id);
      if (attached.get(input.id) === input) continue;
      input.onmidimessage = (event) => handleMessage(input.id, event.data);
      attached.set(input.id, input);
    }
    for (const [id, input] of attached) {
      if (!live.has(id)) {
        input.onmidimessage = null;
        attached.delete(id);
      }
    }
  };

  const clearLeds = () => {
    for (const stop of stopBlinkers.values()) stop();
    stopBlinkers = new Map();
  };

  return {
    start() {
      if (started) return;
      started = true;
      attachInputs();
      access.onstatechange = () => {
        attachInputs();
        emitter.emit("devices", describe());
      };
      emitter.emit("devices", describe());
    },
    stop() {
      started = false;
      access.onstatechange = null;
      for (const input of attached.values()) input.onmidimessage = null;
      attached.clear();
      clearLeds();
      if (learning) {
        learning.timer.cancel();
        learning.reject(new Error("MIDI controller stopped"));
        learning = null;
      }
    },
    devices: describe,
    bindings: () => current.map((binding) => ({ ...binding })),
    setBindings(bindings) {
      current = bindings.map((binding) => ({ ...binding }));
    },
    removeBinding(action) {
      const key = actionKey(action);
      current = current.filter((binding) => actionKey(binding.action) !== key);
    },
    applyPreset(id) {
      const preset = midiPresets.find((candidate) => candidate.id === id);
      if (!preset) throw new Error(`Unknown MIDI preset: ${id}`);
      current = preset.bindings.map((binding) => ({ ...binding }));
      return preset;
    },
    detectPreset() {
      for (const input of connectedInputs()) {
        const preset = findPresetForDevice(input.name ?? "");
        if (preset) return preset;
      }
      return null;
    },
    learn(action, learnOptions = {}) {
      if (learning) {
        learning.timer.cancel();
        learning.reject(new Error("Learn superseded"));
        learning = null;
      }
      return new Promise<MidiBinding>((resolve, reject) => {
        const timer = timers.after(learnOptions.timeoutMs ?? 15_000, () => {
          if (learning?.timer === timer) {
            learning = null;
            reject(new Error("MIDI learn timed out"));
          }
        });
        learning = { action, relative: learnOptions.relative, resolve, reject, timer };
      });
    },
    cancelLearn() {
      if (!learning) return;
      learning.timer.cancel();
      learning.reject(new Error("MIDI learn cancelled"));
      learning = null;
    },
    isLearning: () => learning !== null,
    async load() {
      const stored = await options.storage?.load();
      if (stored) current = parseBindings(stored).bindings;
    },
    async save() {
      await options.storage?.save(serializeBindings(current));
    },
    setLedState(state) {
      clearLeds();
      for (const item of planLeds(current, state)) {
        if (item.mode === "blink") {
          stopBlinkers.set(
            item.key,
            blink(item.led, send, {
              intervalMs: blinkIntervalMs,
              every: (ms, task) => timers.every(ms, task),
            }),
          );
        } else {
          send(item.mode === "on" ? ledOn(item.led) : ledOff(item.led));
        }
      }
    },
    clearLeds,
    onAction: (listener) => emitter.on("action", listener),
    onDevicesChanged: (listener) => emitter.on("devices", listener),
  };
}
