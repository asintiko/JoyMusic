import { ApiError } from "@joymusic/shared";
import type { CommandOutcome, OutboxCommand } from "../common/commands";
import type { ApiService } from "./api-service";
import { isTransientFailure } from "./api-service";
import type { CoreEnvironment } from "./environment";
import { NetworkFailure } from "./errors";
import { createOutbox } from "./outbox";
import type { FailureClass } from "./outbox";
import type { Connectivity } from "./connectivity";

export const outboxFileName = "outbox.json";

export function classifyFailure(error: unknown): FailureClass {
  if (isTransientFailure(error)) return "retry";
  if (error instanceof ApiError) {
    if (error.status === 401) return "halt";
    if ([400, 403, 404, 409, 422].includes(error.status)) return "drop";
    return "retry";
  }
  return "drop";
}

export async function executeCommand(api: ApiService, command: OutboxCommand): Promise<void> {
  switch (command.kind) {
    case "accept":
      await api.call("djRequestAccept", { params: { id: command.requestId } });
      return;
    case "decline":
      await api.call("djRequestDecline", {
        params: { id: command.requestId },
        body: { reason: command.reason },
      });
      return;
    case "play":
      await api.call("djRequestPlay", { params: { id: command.requestId } });
      return;
    case "played":
      await api.call("djRequestPlayed", { params: { id: command.requestId } });
      return;
    case "reorder":
      await api.call("djQueueReorder", {
        params: { sessionId: command.sessionId },
        body: { order: command.order },
      });
      return;
    case "nowplaying.set":
      await api.call("djNowPlayingSet", {
        params: { sessionId: command.sessionId },
        body: command.input,
      });
      return;
    case "nowplaying.clear":
      await api.call("djNowPlayingClear", { params: { sessionId: command.sessionId } });
      return;
    case "settings":
      await api.call("djSessionSettings", {
        params: { sessionId: command.sessionId },
        body: command.patch,
      });
      return;
  }
}

export function createCommandsService(
  env: CoreEnvironment,
  api: ApiService,
  connectivity: Connectivity,
  createId: () => string,
) {
  const outbox = createOutbox({
    load: () => env.files.read(outboxFileName),
    save: (text) => env.files.write(outboxFileName, text),
    execute: (command) => executeCommand(api, command),
    classify: classifyFailure,
    now: env.now,
    createId,
  });

  connectivity.onRecovered(() => {
    void outbox.flush();
  });

  return {
    outbox,
    async run(command: OutboxCommand): Promise<CommandOutcome> {
      if (!connectivity.topic.get().online || outbox.size() > 0) {
        const entry = await outbox.enqueue(command);
        if (!connectivity.topic.get().online) return { status: "queued" };
        await outbox.flush();
        return { status: outbox.contains(entry.id) ? "queued" : "done" };
      }
      try {
        await executeCommand(api, command);
        return { status: "done" };
      } catch (error) {
        if (error instanceof NetworkFailure || isTransientFailure(error)) {
          await outbox.enqueue(command);
          return { status: "queued" };
        }
        throw error;
      }
    },
    retry: () => outbox.flush(),
    discard: () => outbox.clear(),
  };
}

export type CommandsService = ReturnType<typeof createCommandsService>;
