import { localeSchema } from "@joymusic/shared";
import { z } from "zod";

export const stageThemeSchema = z.enum(["venue", "club", "lounge", "cafe"]);
export type StageTheme = z.infer<typeof stageThemeSchema>;

export const adapterIds = [
  "serato",
  "virtualdj",
  "traktor",
  "textfile",
  "prolink",
  "stagelinq",
  "simulator",
] as const;
export type AdapterId = (typeof adapterIds)[number];

export const defaultTextTemplate = "{artist} - {title}";
export const defaultTraktorPort = 8000;

const pathSchema = z.string().max(1024).nullable();

export const adapterSettingsSchema = z.object({
  serato: z.object({ enabled: z.boolean(), directory: pathSchema }),
  virtualdj: z.object({
    enabled: z.boolean(),
    directory: pathSchema,
    nowPlayingFile: pathSchema,
  }),
  traktor: z.object({
    enabled: z.boolean(),
    port: z.number().int().min(1024).max(65535),
    password: z.string().max(128).nullable(),
  }),
  textfile: z.object({
    enabled: z.boolean(),
    path: pathSchema,
    template: z.string().min(1).max(200),
  }),
  prolink: z.object({ enabled: z.boolean() }),
  stagelinq: z.object({ enabled: z.boolean() }),
  simulator: z.object({ enabled: z.boolean() }),
});
export type AdapterSettings = z.infer<typeof adapterSettingsSchema>;

export const settingsSchema = z.object({
  version: z.literal(1),
  locale: localeSchema,
  boothMode: z.boolean(),
  largeTargets: z.boolean(),
  lastVenueId: z.string().max(64).nullable(),
  stage: z.object({
    displayId: z.number().int().nullable(),
    theme: stageThemeSchema,
    autoOpen: z.boolean(),
  }),
  midi: z.object({
    enabled: z.boolean(),
    presetId: z.string().max(64).nullable(),
    ledFeedback: z.boolean(),
  }),
  adapters: adapterSettingsSchema,
  updates: z.object({ autoCheck: z.boolean() }),
});
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  version: 1,
  locale: "uz",
  boothMode: false,
  largeTargets: false,
  lastVenueId: null,
  stage: { displayId: null, theme: "venue", autoOpen: false },
  midi: { enabled: true, presetId: null, ledFeedback: true },
  adapters: {
    serato: { enabled: false, directory: null },
    virtualdj: { enabled: false, directory: null, nowPlayingFile: null },
    traktor: { enabled: false, port: defaultTraktorPort, password: null },
    textfile: { enabled: false, path: null, template: defaultTextTemplate },
    prolink: { enabled: false },
    stagelinq: { enabled: false },
    simulator: { enabled: false },
  },
  updates: { autoCheck: true },
};

export const settingsPatchSchema = z.object({
  locale: settingsSchema.shape.locale.optional(),
  boothMode: z.boolean().optional(),
  largeTargets: z.boolean().optional(),
  lastVenueId: z.string().max(64).nullable().optional(),
  stage: settingsSchema.shape.stage.partial().optional(),
  midi: settingsSchema.shape.midi.partial().optional(),
  adapters: z
    .object({
      serato: adapterSettingsSchema.shape.serato.partial().optional(),
      virtualdj: adapterSettingsSchema.shape.virtualdj.partial().optional(),
      traktor: adapterSettingsSchema.shape.traktor.partial().optional(),
      textfile: adapterSettingsSchema.shape.textfile.partial().optional(),
      prolink: adapterSettingsSchema.shape.prolink.partial().optional(),
      stagelinq: adapterSettingsSchema.shape.stagelinq.partial().optional(),
      simulator: adapterSettingsSchema.shape.simulator.partial().optional(),
    })
    .optional(),
  updates: settingsSchema.shape.updates.partial().optional(),
});
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export function applySettingsPatch(current: Settings, patch: SettingsPatch): Settings {
  const merged: Settings = {
    ...current,
    ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
    ...(patch.boothMode !== undefined ? { boothMode: patch.boothMode } : {}),
    ...(patch.largeTargets !== undefined ? { largeTargets: patch.largeTargets } : {}),
    ...(patch.lastVenueId !== undefined ? { lastVenueId: patch.lastVenueId } : {}),
    stage: { ...current.stage, ...stripUndefined(patch.stage) },
    midi: { ...current.midi, ...stripUndefined(patch.midi) },
    updates: { ...current.updates, ...stripUndefined(patch.updates) },
    adapters: {
      serato: { ...current.adapters.serato, ...stripUndefined(patch.adapters?.serato) },
      virtualdj: { ...current.adapters.virtualdj, ...stripUndefined(patch.adapters?.virtualdj) },
      traktor: { ...current.adapters.traktor, ...stripUndefined(patch.adapters?.traktor) },
      textfile: { ...current.adapters.textfile, ...stripUndefined(patch.adapters?.textfile) },
      prolink: { ...current.adapters.prolink, ...stripUndefined(patch.adapters?.prolink) },
      stagelinq: { ...current.adapters.stagelinq, ...stripUndefined(patch.adapters?.stagelinq) },
      simulator: { ...current.adapters.simulator, ...stripUndefined(patch.adapters?.simulator) },
    },
  };
  return settingsSchema.parse(merged);
}

function stripUndefined<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export function parseStoredSettings(text: string | null): Settings {
  if (!text) return defaultSettings;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return defaultSettings;
  }
  const strict = settingsSchema.safeParse(raw);
  if (strict.success) return strict.data;
  const patch = settingsPatchSchema.safeParse(raw);
  if (patch.success) {
    try {
      return applySettingsPatch(defaultSettings, patch.data);
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}
