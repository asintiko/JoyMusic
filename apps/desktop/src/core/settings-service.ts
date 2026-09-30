import {
  applySettingsPatch,
  defaultSettings,
  parseStoredSettings,
  settingsPatchSchema,
} from "../common/settings";
import type { Settings, SettingsPatch } from "../common/settings";
import type { FileStore } from "./environment";
import { createTopic } from "./topic";

export const settingsFileName = "settings.json";

export function createSettingsService(files: FileStore) {
  const topic = createTopic<Settings>(defaultSettings);
  let writing: Promise<void> = Promise.resolve();

  const persist = (settings: Settings) => {
    writing = writing
      .catch(() => undefined)
      .then(() => files.write(settingsFileName, JSON.stringify(settings, null, 2)));
    return writing;
  };

  return {
    topic,
    async init() {
      topic.set(parseStoredSettings(await files.read(settingsFileName)));
    },
    get: () => topic.get(),
    async update(patch: SettingsPatch): Promise<Settings> {
      const parsed = settingsPatchSchema.parse(patch);
      const next = applySettingsPatch(topic.get(), parsed);
      topic.set(next);
      await persist(next);
      return next;
    },
    flush: () => writing,
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
