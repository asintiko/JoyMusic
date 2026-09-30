import { idSchema, localeSchema, slugSchema, venueThemeSchema } from "@joymusic/shared";
import { z } from "zod";
import { djRouteNames, topicNames } from "./bridge";
import { outboxCommandSchema } from "./commands";
import { settingsPatchSchema, stageThemeSchema } from "./settings";

export { channels, menuCommands } from "./channels";
export type { MenuCommand } from "./channels";

export const topicNameSchema = z.enum(topicNames);
export const routeNameSchema = z.enum(djRouteNames);

export const passwordLoginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const apiCallSchema = z.object({
  name: routeNameSchema,
  input: z.unknown().optional(),
});

export const sessionContextSchema = z
  .object({
    venueId: idSchema,
    venueSlug: slugSchema,
    venueName: z.string().max(120),
    venueTheme: venueThemeSchema,
    sessionId: idSchema,
  })
  .nullable();

export const realtimeSubscribeSchema = z.object({
  id: z.string().min(1).max(64),
  target: z.object({ venue: slugSchema, role: z.enum(["dj", "tv"]) }),
});

export const realtimeUnsubscribeSchema = z.object({ id: z.string().min(1).max(64) });

export const stageConfigSchema = z
  .object({
    venueSlug: slugSchema,
    venueName: z.string().max(120),
    venueCity: z.string().max(80).nullable(),
    venueTheme: venueThemeSchema,
    logoUrl: z.string().max(2048).nullable(),
    coverUrl: z.string().max(2048).nullable(),
    qrUrl: z.url().max(2048),
    displayUrl: z.string().max(200),
    locale: localeSchema,
    themeOverride: stageThemeSchema,
  })
  .nullable();

export const stageOpenSchema = z.object({ displayId: z.number().int().nullable().optional() });
export const pickPathSchema = z.object({ kind: z.enum(["directory", "file"]) });
export const openExternalSchema = z.object({ url: z.url().max(2048) });
export const midiSaveSchema = z.object({ json: z.string().max(200_000) });
export const commandRunSchema = outboxCommandSchema;
export const settingsUpdateSchema = settingsPatchSchema;
export const topicGetSchema = z.object({ name: topicNameSchema });
