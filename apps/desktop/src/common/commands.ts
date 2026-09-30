import { nowPlayingInputSchema, venueSettingsSchema, idSchema } from "@joymusic/shared";
import { z } from "zod";

export const outboxCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("accept"), requestId: idSchema }),
  z.object({
    kind: z.literal("decline"),
    requestId: idSchema,
    reason: z.string().trim().max(200).optional(),
  }),
  z.object({ kind: z.literal("play"), requestId: idSchema }),
  z.object({ kind: z.literal("played"), requestId: idSchema }),
  z.object({
    kind: z.literal("reorder"),
    sessionId: idSchema,
    order: z.array(idSchema).max(500),
  }),
  z.object({
    kind: z.literal("nowplaying.set"),
    sessionId: idSchema,
    input: nowPlayingInputSchema,
  }),
  z.object({ kind: z.literal("nowplaying.clear"), sessionId: idSchema }),
  z.object({
    kind: z.literal("settings"),
    sessionId: idSchema,
    patch: venueSettingsSchema.partial(),
  }),
]);
export type OutboxCommand = z.infer<typeof outboxCommandSchema>;
export type OutboxCommandKind = OutboxCommand["kind"];

export const outboxEntrySchema = z.object({
  id: z.string().min(1).max(80),
  command: outboxCommandSchema,
  createdAt: z.number(),
  attempts: z.number().int().min(0),
});
export type OutboxEntry = z.infer<typeof outboxEntrySchema>;

export const outboxFileSchema = z.object({
  version: z.literal(1),
  entries: z.array(outboxEntrySchema),
});

export interface OutboxState {
  pending: number;
  flushing: boolean;
  entries: {
    id: string;
    kind: OutboxCommandKind;
    command: OutboxCommand;
    createdAt: number;
    attempts: number;
  }[];
  lastSkipped: { id: string; kind: OutboxCommandKind; reason: string; at: number } | null;
}

export const emptyOutboxState: OutboxState = {
  pending: 0,
  flushing: false,
  entries: [],
  lastSkipped: null,
};

export type CommandOutcome = { status: "done" } | { status: "queued" };
