import { z } from "zod";
import {
  idSchema,
  isoDateSchema,
  nowPlayingSchema,
  requestItemSchema,
  venueSettingsSchema,
  venueStateSchema,
} from "./domain";

export const realtimePath = "/v1/ws";

export const realtimeRoles = ["guest", "dj", "tv"] as const;
export const realtimeRoleSchema = z.enum(realtimeRoles);
export type RealtimeRole = z.infer<typeof realtimeRoleSchema>;

export const realtimeQuerySchema = z.object({
  venue: z.string().min(1),
  role: realtimeRoleSchema.default("guest"),
  token: z.string().optional(),
});
export type RealtimeQuery = z.infer<typeof realtimeQuerySchema>;

const envelope = {
  seq: z.number().int().min(0),
  venueId: idSchema,
  at: isoDateSchema,
};

export const serverEventSchema = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("state.snapshot"), data: venueStateSchema }),
  z.object({
    ...envelope,
    type: z.literal("nowplaying.updated"),
    data: z.object({ nowPlaying: nowPlayingSchema.nullable() }),
  }),
  z.object({
    ...envelope,
    type: z.literal("request.upserted"),
    data: z.object({ request: requestItemSchema }),
  }),
  z.object({
    ...envelope,
    type: z.literal("request.removed"),
    data: z.object({ requestId: idSchema }),
  }),
  z.object({
    ...envelope,
    type: z.literal("queue.reordered"),
    data: z.object({ order: z.array(idSchema) }),
  }),
  z.object({
    ...envelope,
    type: z.literal("settings.updated"),
    data: z.object({ settings: venueSettingsSchema }),
  }),
  z.object({
    ...envelope,
    type: z.literal("session.changed"),
    data: z.object({
      session: z.object({ id: idSchema, djName: z.string(), startedAt: isoDateSchema }).nullable(),
    }),
  }),
]);
export type ServerEvent = z.infer<typeof serverEventSchema>;
export type ServerEventType = ServerEvent["type"];

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("resync"), lastSeq: z.number().int().min(0) }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const pongMessageSchema = z.object({ type: z.literal("pong"), serverTime: isoDateSchema });
export type PongMessage = z.infer<typeof pongMessageSchema>;
