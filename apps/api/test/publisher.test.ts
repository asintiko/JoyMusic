import { describe, expect, it } from "vitest";
import { createMemoryPubSub } from "../src/infra/pubsub";
import { createMemorySequenceStore } from "../src/infra/sequence";
import { createVenuePublisher, venueChannel } from "../src/realtime/publisher";

describe("venue publisher", () => {
  it("stamps contiguous per venue sequence numbers in publish order", async () => {
    const pubsub = createMemoryPubSub();
    const sequences = createMemorySequenceStore();
    const publisher = createVenuePublisher({
      pubsub,
      sequences,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    const received: Record<string, Record<string, unknown>[]> = { one: [], two: [] };
    for (const venue of ["one", "two"]) {
      await pubsub.subscribe(venueChannel(venue), (message) => {
        received[venue]?.push(JSON.parse(message) as Record<string, unknown>);
      });
    }
    await Promise.all([
      publisher.publish("one", { type: "session.changed", data: { session: null } }),
      publisher.publish("two", { type: "session.changed", data: { session: null } }),
      publisher.publish("one", { type: "queue.reordered", data: { order: ["a"] } }),
      publisher.publish("one", { type: "queue.reordered", data: { order: ["b"] } }),
    ]);
    expect(received.one?.map((event) => event.seq)).toEqual([1, 2, 3]);
    expect(received.one?.map((event) => event.type)).toEqual([
      "session.changed",
      "queue.reordered",
      "queue.reordered",
    ]);
    expect(received.two?.map((event) => event.seq)).toEqual([1]);
    expect(received.one?.[0]).toMatchObject({ venueId: "one", at: "2026-01-01T00:00:00.000Z" });
    expect(await sequences.current("one")).toBe(3);
    expect(await sequences.current("unknown")).toBe(0);
  });

  it("keeps publishing after a failed delivery", async () => {
    const pubsub = createMemoryPubSub();
    let failNext = true;
    const flaky = {
      ...pubsub,
      publish(channel: string, message: string) {
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error("down"));
        }
        return pubsub.publish(channel, message);
      },
    };
    const publisher = createVenuePublisher({
      pubsub: flaky,
      sequences: createMemorySequenceStore(),
    });
    const seen: unknown[] = [];
    await pubsub.subscribe(venueChannel("v"), (message) => seen.push(JSON.parse(message)));
    await expect(
      publisher.publish("v", { type: "session.changed", data: { session: null } }),
    ).rejects.toThrow("down");
    await publisher.publish("v", { type: "session.changed", data: { session: null } });
    expect(seen).toHaveLength(1);
  });
});
