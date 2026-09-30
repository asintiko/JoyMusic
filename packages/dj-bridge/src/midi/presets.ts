import type { ConsoleAction, MidiBinding, MidiPreset } from "./types";

const padActions: readonly ConsoleAction[] = [
  { type: "acceptTop" },
  { type: "declineTop" },
  { type: "playNext" },
  { type: "markPlayed" },
  { type: "toggleRequestsOpen" },
  { type: "pushToAir" },
];

function padBindings(
  channel: number,
  firstNote: number,
  encoder: { channel: number; cc: number },
): MidiBinding[] {
  const pads = padActions.map((action, index): MidiBinding => ({
    match: { type: "noteOn", channel, number: firstNote + index },
    action,
  }));
  const browse: MidiBinding = {
    match: { type: "cc", channel: encoder.channel, number: encoder.cc },
    action: { type: "moveSelection", delta: 1 },
    relative: true,
    led: null,
  };
  return [...pads, browse];
}

const unverifiedNote =
  "Note numbers are an unconfirmed starting point and were not tested on the device. Use MIDI learn.";

export const midiPresets: readonly MidiPreset[] = [
  {
    id: "pioneer-ddj-flx4",
    name: "Pioneer DDJ-FLX4",
    deviceMatch: /DDJ-?FLX4/iu,
    verified: false,
    notes: unverifiedNote,
    bindings: padBindings(8, 0x00, { channel: 7, cc: 0x40 }),
  },
  {
    id: "pioneer-ddj-400",
    name: "Pioneer DDJ-400",
    deviceMatch: /DDJ-?400/iu,
    verified: false,
    notes: unverifiedNote,
    bindings: padBindings(8, 0x00, { channel: 7, cc: 0x40 }),
  },
  {
    id: "numark-mixtrack",
    name: "Numark Mixtrack",
    deviceMatch: /Mixtrack/iu,
    verified: false,
    notes: unverifiedNote,
    bindings: padBindings(5, 0x18, { channel: 1, cc: 0x1a }),
  },
  {
    id: "ni-kontrol-s2",
    name: "Native Instruments Kontrol S2",
    deviceMatch: /Kontrol\s*S2/iu,
    verified: false,
    notes: `${unverifiedNote} Newer Mk2 and Mk3 models talk HID by default and may not appear as MIDI devices at all.`,
    bindings: padBindings(1, 0x10, { channel: 1, cc: 0x30 }),
  },
  {
    id: "ni-kontrol-s4",
    name: "Native Instruments Kontrol S4",
    deviceMatch: /Kontrol\s*S4/iu,
    verified: false,
    notes: `${unverifiedNote} Newer Mk2 and Mk3 models talk HID by default and may not appear as MIDI devices at all.`,
    bindings: padBindings(1, 0x10, { channel: 1, cc: 0x30 }),
  },
];

export function findPresetForDevice(deviceName: string): MidiPreset | null {
  return midiPresets.find((preset) => preset.deviceMatch.test(deviceName)) ?? null;
}
