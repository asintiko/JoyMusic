import type { ServerEvent } from "@joymusic/shared";
import type { SequenceStore } from "../infra/sequence";
import type { PubSub } from "../infra/pubsub";

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type VenueEventInput = DistributiveOmit<ServerEvent, "seq" | "venueId" | "at">;

export interface VenuePublisher {
  publish(venueId: string, event: VenueEventInput): Promise<void>;
}

export const noopVenuePublisher: VenuePublisher = {
  publish: () => Promise.resolve(),
};

export function venueChannel(venueId: string): string {
  return `venue:${venueId}`;
}

export interface VenuePublisherOptions {
  pubsub: PubSub;
  sequences: SequenceStore;
  now?: () => Date;
}

export function createVenuePublisher(options: VenuePublisherOptions): VenuePublisher {
  const now = options.now ?? (() => new Date());
  const tails = new Map<string, Promise<void>>();

  async function deliver(venueId: string, event: VenueEventInput): Promise<void> {
    const seq = await options.sequences.next(venueId);
    const envelope = { ...event, seq, venueId, at: now().toISOString() } as ServerEvent;
    await options.pubsub.publish(venueChannel(venueId), JSON.stringify(envelope));
  }

  return {
    publish(venueId, event) {
      const previous = tails.get(venueId) ?? Promise.resolve();
      const run = previous.then(() => deliver(venueId, event));
      const tail = run.catch(() => undefined);
      tails.set(venueId, tail);
      void tail.then(() => {
        if (tails.get(venueId) === tail) tails.delete(venueId);
      });
      return run;
    },
  };
}
