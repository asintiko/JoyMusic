import { describe, expect, it } from "vitest";
import { createManualTime } from "../testing";
import { parseMidiMessage } from "./actions";
import { createMidiController } from "./controller";
import { blink, ledOff, ledOn, planLeds } from "./leds";
import { findPresetForDevice, midiPresets } from "./presets";
import { createMemoryBindingStorage, parseBindings, serializeBindings } from "./storage";
import type {
  ConsoleActionEvent,
  MidiAccessLike,
  MidiBinding,
  MidiInputLike,
  MidiOutputLike,
  QueueLedState,
} from "./types";

interface FakeInput extends MidiInputLike {
  emit(data: number[]): void;
}

function createFakeAccess() {
  const inputs = new Map<string, FakeInput>();
  const outputs = new Map<string, MidiOutputLike>();
  const sent: number[][] = [];
  const access: MidiAccessLike = {
    inputs,
    outputs,
    onstatechange: null,
  };
  const addDevice = (id: string, name: string) => {
    const input: FakeInput = {
      id: `in-${id}`,
      name,
      manufacturer: "Fake",
      state: "connected",
      onmidimessage: null,
      emit(data) {
        input.onmidimessage?.({ data: Uint8Array.from(data) });
      },
    };
    inputs.set(input.id, input);
    outputs.set(`out-${id}`, {
      id: `out-${id}`,
      name,
      state: "connected",
      send: (data) => void sent.push([...data]),
    });
    access.onstatechange?.({ port: input });
    return input;
  };
  const removeDevice = (id: string) => {
    const input = inputs.get(`in-${id}`);
    if (input) input.state = "disconnected";
    const output = outputs.get(`out-${id}`);
    if (output) output.state = "disconnected";
    access.onstatechange?.({ port: input ?? null });
  };
  return { access, addDevice, removeDevice, sent, outputs };
}

describe("parseMidiMessage", () => {
  it("decodes note on, note on with zero velocity, cc and ignores system messages", () => {
    expect(parseMidiMessage([0x97, 0x05, 100])).toEqual({
      kind: "noteOn",
      channel: 8,
      number: 5,
      value: 100,
    });
    expect(parseMidiMessage([0x90, 0x05, 0])?.kind).toBe("noteOff");
    expect(parseMidiMessage([0xb6, 0x40, 1])).toMatchObject({ kind: "cc", channel: 7, number: 64 });
    expect(parseMidiMessage([0xf8])).toBeNull();
    expect(parseMidiMessage(null)).toBeNull();
  });
});

describe("MidiController", () => {
  const bindings: MidiBinding[] = [
    { match: { type: "noteOn", channel: 1, number: 10 }, action: { type: "acceptTop" } },
    { match: { type: "noteOn", channel: 1, number: 11 }, action: { type: "declineTop" } },
    { match: { type: "cc", channel: 1, number: 20 }, action: { type: "playNext" } },
    {
      match: { type: "cc", channel: 2, number: 30 },
      action: { type: "moveSelection", delta: 1 },
      relative: true,
    },
  ];

  it("discovers devices and hotplug", () => {
    const fake = createFakeAccess();
    fake.addDevice("a", "DDJ-400");
    const controller = createMidiController({ access: fake.access });
    const snapshots: number[] = [];
    controller.onDevicesChanged((devices) =>
      snapshots.push(devices.filter((d) => d.connected).length),
    );
    controller.start();
    fake.addDevice("b", "Mixtrack Pro 3");
    fake.removeDevice("a");
    expect(snapshots).toEqual([2, 4, 2]);
    expect(controller.detectPreset()?.id).toBe("numark-mixtrack");
  });

  it("dispatches bound notes, cc presses and relative encoders", () => {
    const fake = createFakeAccess();
    const input = fake.addDevice("a", "Ctl");
    const controller = createMidiController({ access: fake.access });
    controller.setBindings(bindings);
    controller.start();
    const events: ConsoleActionEvent[] = [];
    controller.onAction((event) => events.push(event));

    input.emit([0x90, 10, 127]);
    input.emit([0x90, 10, 0]);
    input.emit([0x90, 99, 127]);
    input.emit([0xb0, 20, 127]);
    input.emit([0xb0, 20, 0]);
    input.emit([0xb1, 30, 1]);
    input.emit([0xb1, 30, 127]);
    input.emit([0xb1, 30, 64]);
    expect(events.map((event) => JSON.stringify(event.action))).toEqual([
      '{"type":"acceptTop"}',
      '{"type":"playNext"}',
      '{"type":"moveSelection","delta":1}',
      '{"type":"moveSelection","delta":-1}',
    ]);
  });

  it("stops receiving after stop and picks up hotplugged inputs", () => {
    const fake = createFakeAccess();
    const controller = createMidiController({ access: fake.access });
    controller.setBindings(bindings);
    controller.start();
    const late = fake.addDevice("late", "Late");
    const events: ConsoleActionEvent[] = [];
    controller.onAction((event) => events.push(event));
    late.emit([0x90, 11, 100]);
    expect(events).toHaveLength(1);
    controller.stop();
    late.emit([0x90, 11, 100]);
    expect(events).toHaveLength(1);
  });

  it("learns the next message for an action and replaces conflicting bindings", async () => {
    const fake = createFakeAccess();
    const input = fake.addDevice("a", "Ctl");
    const controller = createMidiController({ access: fake.access });
    controller.setBindings(bindings);
    controller.start();
    const events: ConsoleActionEvent[] = [];
    controller.onAction((event) => events.push(event));

    const pending = controller.learn({ type: "markPlayed" });
    expect(controller.isLearning()).toBe(true);
    input.emit([0xf8]);
    input.emit([0x90, 10, 0]);
    input.emit([0x90, 10, 127]);
    const learned = await pending;
    expect(learned).toEqual({
      match: { type: "noteOn", channel: 1, number: 10 },
      action: { type: "markPlayed" },
    });
    expect(events).toHaveLength(0);
    expect(controller.bindings().some((binding) => binding.action.type === "acceptTop")).toBe(
      false,
    );
    input.emit([0x90, 10, 127]);
    expect(events[0]?.action.type).toBe("markPlayed");
  });

  it("learns cc for moveSelection as a relative encoder and times out or cancels", async () => {
    const fake = createFakeAccess();
    const input = fake.addDevice("a", "Ctl");
    const time = createManualTime();
    const controller = createMidiController({ access: fake.access, timers: time });
    controller.start();
    const moved = controller.learn({ type: "moveSelection", delta: -1 });
    input.emit([0xb0, 50, 127]);
    expect(await moved).toMatchObject({ relative: true, match: { type: "cc", number: 50 } });

    const timeout = controller.learn({ type: "pushToAir" }, { timeoutMs: 1000 });
    time.advance(1000);
    await expect(timeout).rejects.toThrow("timed out");
    expect(controller.isLearning()).toBe(false);

    const cancelled = controller.learn({ type: "pushToAir" });
    controller.cancelLearn();
    await expect(cancelled).rejects.toThrow("cancelled");
  });

  it("persists bindings as JSON and restores them", async () => {
    const storage = createMemoryBindingStorage();
    const fake = createFakeAccess();
    const first = createMidiController({ access: fake.access, storage });
    first.setBindings(bindings);
    await first.save();
    const second = createMidiController({ access: fake.access, storage });
    await second.load();
    expect(second.bindings()).toEqual(bindings);
  });

  it("drives LEDs from queue state on matched outputs only", () => {
    const fake = createFakeAccess();
    fake.addDevice("a", "Ctl");
    fake.outputs.set("out-other", {
      id: "out-other",
      name: "Synth",
      state: "connected",
      send: () => {
        throw new Error("must not be used");
      },
    });
    const time = createManualTime();
    const controller = createMidiController({
      access: fake.access,
      timers: time,
      blinkIntervalMs: 100,
    });
    controller.setBindings(bindings);
    controller.start();

    controller.setLedState({ pending: 2, queued: 0, playing: false, requestsOpen: true });
    expect(fake.sent).toEqual([
      [0x90, 10, 127],
      [0x90, 11, 127],
    ]);
    time.advance(100);
    expect(fake.sent.at(-1)).toEqual([0x90, 10, 0]);
    time.advance(100);
    expect(fake.sent.at(-1)).toEqual([0x90, 10, 127]);

    controller.setLedState({ pending: 0, queued: 0, playing: false, requestsOpen: true });
    expect(fake.sent.slice(-2)).toEqual([
      [0x90, 10, 0],
      [0x90, 11, 0],
    ]);
    expect(time.pending()).toBe(0);
  });

  it("applies presets and rejects unknown ones", () => {
    const controller = createMidiController({ access: createFakeAccess().access });
    expect(controller.applyPreset("pioneer-ddj-400").verified).toBe(false);
    expect(controller.bindings().length).toBeGreaterThan(5);
    expect(() => controller.applyPreset("nope")).toThrow();
  });
});

describe("LED builders", () => {
  const led = { type: "noteOn", channel: 8, number: 3 } as const;

  it("builds note and cc messages", () => {
    expect(ledOn(led)).toEqual([0x97, 3, 127]);
    expect(ledOff(led)).toEqual([0x97, 3, 0]);
    expect(ledOn({ type: "cc", channel: 1, number: 9, onValue: 64 })).toEqual([0xb0, 9, 64]);
  });

  it("blinks and restores off when stopped", () => {
    const time = createManualTime();
    const sent: number[][] = [];
    const stop = blink(led, (message) => sent.push(message), { intervalMs: 50, every: time.every });
    time.advance(100);
    stop();
    expect(sent).toEqual([
      [0x97, 3, 127],
      [0x97, 3, 0],
      [0x97, 3, 127],
      [0x97, 3, 0],
    ]);
    expect(time.pending()).toBe(0);
  });

  it("plans modes from queue state and skips bindings without LEDs", () => {
    const state: QueueLedState = { pending: 1, queued: 3, playing: true, requestsOpen: false };
    const plan = planLeds(midiPresets[0]?.bindings ?? [], state);
    const byKey = Object.fromEntries(plan.map((item) => [item.key, item.mode]));
    expect(byKey).toMatchObject({
      acceptTop: "blink",
      declineTop: "on",
      playNext: "on",
      markPlayed: "on",
      toggleRequestsOpen: "off",
      pushToAir: "on",
    });
    expect(byKey["moveSelection:1"]).toBeUndefined();
  });
});

describe("storage and presets", () => {
  it("skips invalid stored entries", () => {
    const json = JSON.stringify({
      version: 1,
      bindings: [
        { match: { type: "cc", channel: 99, number: 1 }, action: { type: "acceptTop" } },
        { match: { type: "cc", channel: 1, number: 1 }, action: { type: "explode" } },
        { match: { type: "noteOn", channel: 1, number: 1 }, action: { type: "pushToAir" } },
      ],
    });
    const parsed = parseBindings(json);
    expect(parsed.skipped).toBe(2);
    expect(parsed.bindings).toHaveLength(1);
    expect(parseBindings("not json")).toEqual({ bindings: [], skipped: 0 });
    expect(parseBindings(serializeBindings([])).bindings).toEqual([]);
  });

  it("marks every preset unverified and matches device names", () => {
    expect(midiPresets.every((preset) => preset.verified === false)).toBe(true);
    expect(findPresetForDevice("Pioneer DDJ-FLX4 MIDI 1")?.id).toBe("pioneer-ddj-flx4");
    expect(findPresetForDevice("DDJ-400")?.id).toBe("pioneer-ddj-400");
    expect(findPresetForDevice("Traktor Kontrol S4")?.id).toBe("ni-kontrol-s4");
    expect(findPresetForDevice("Unknown")).toBeNull();
    const ids = midiPresets.map((preset) => preset.id);
    expect(ids).toContain("ni-kontrol-s2");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accepts a real MIDIAccess shape structurally", () => {
    const accept = (_access: MidiAccessLike) => undefined;
    const real = null as unknown as MIDIAccess;
    expect(() => accept(real as MidiAccessLike)).not.toThrow();
  });
});
