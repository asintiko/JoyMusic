import type { FastifyBaseLogger } from "fastify";
import type { RequestItem } from "@joymusic/shared";
import type { VenueEventInput, VenuePublisher } from "../realtime/publisher";

export function requestUpserted(request: RequestItem): VenueEventInput {
  return { type: "request.upserted", data: { request } };
}

export async function publishEvents(
  publisher: VenuePublisher,
  log: FastifyBaseLogger,
  venueId: string,
  events: readonly VenueEventInput[],
): Promise<void> {
  for (const event of events) {
    try {
      await publisher.publish(venueId, event);
    } catch (error) {
      log.error({ err: error, venueId, type: event.type }, "failed to publish venue event");
    }
  }
}
