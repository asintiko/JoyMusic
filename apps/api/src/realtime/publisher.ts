import type { ServerEvent } from "@joymusic/shared";

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type VenueEventInput = DistributiveOmit<ServerEvent, "seq" | "venueId" | "at">;

export interface VenuePublisher {
  publish(venueId: string, event: VenueEventInput): Promise<void>;
}

export const noopVenuePublisher: VenuePublisher = {
  publish: () => Promise.resolve(),
};
