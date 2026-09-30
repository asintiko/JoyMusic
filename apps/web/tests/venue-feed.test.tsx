import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeClientOptions, ServerEvent } from "@joymusic/shared";
import { useExternalValue } from "@/lib/external-value";
import { useVenueFeed } from "@/guest/use-venue-feed";
import { makeRequest, makeVenueState } from "./helpers";

const captured: { options: RealtimeClientOptions | null; started: number; stopped: number } = {
  options: null,
  started: 0,
  stopped: 0,
};

vi.mock("@/lib/shared-runtime", () => ({
  loadShared: async () => ({
    createRealtimeClient: (options: RealtimeClientOptions) => {
      captured.options = options;
      return {
        start: () => {
          captured.started += 1;
        },
        stop: () => {
          captured.stopped += 1;
        },
        resync: () => undefined,
      };
    },
    createApiClient: () => ({ call: async () => makeVenueState({ seq: 99 }) }),
  }),
}));

function Probe({ initial }: { initial: ReturnType<typeof makeVenueState> | null }) {
  const feed = useVenueFeed({ slug: "joy-demo-club", role: "tv", initial });
  const status = useExternalValue(feed.status);
  return (
    <div>
      <span data-testid="seq">{feed.venue?.seq ?? "none"}</span>
      <span data-testid="queue">{feed.venue?.queue.map((item) => item.title).join(",") ?? ""}</span>
      <span data-testid="status">{status}</span>
    </div>
  );
}

const envelope = { venueId: "ven_1", at: "2026-09-30T20:00:05.000Z" };

beforeEach(() => {
  captured.options = null;
  captured.started = 0;
  captured.stopped = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useVenueFeed", () => {
  it("starts from the server rendered state and applies realtime events", async () => {
    const { unmount } = render(<Probe initial={makeVenueState({ seq: 3 })} />);
    expect(screen.getByTestId("seq")).toHaveTextContent("3");
    await waitFor(() => expect(captured.started).toBe(1));
    const options = captured.options;
    if (!options) throw new Error("realtime client was not created");
    expect(options.role).toBe("tv");
    expect(options.venue).toBe("joy-demo-club");

    act(() => options.onStatus?.("open"));
    expect(screen.getByTestId("status")).toHaveTextContent("open");

    const event: ServerEvent = {
      ...envelope,
      seq: 4,
      type: "request.upserted",
      data: {
        request: makeRequest({ id: "a", status: "accepted", position: 1, title: "Levitating" }),
      },
    };
    act(() => options.onEvent(event));
    expect(screen.getByTestId("queue")).toHaveTextContent("Levitating");
    expect(screen.getByTestId("seq")).toHaveTextContent("4");

    unmount();
    expect(captured.stopped).toBe(1);
  });

  it("ignores a repeated snapshot with the same sequence", async () => {
    render(
      <Probe
        initial={makeVenueState({
          seq: 5,
          queue: [makeRequest({ id: "a", status: "accepted", title: "Kept" })],
        })}
      />,
    );
    await waitFor(() => expect(captured.options).not.toBeNull());
    const snapshot: ServerEvent = {
      ...envelope,
      seq: 5,
      type: "state.snapshot",
      data: makeVenueState({ seq: 5, queue: [] }),
    };
    act(() => captured.options?.onEvent(snapshot));
    expect(screen.getByTestId("queue")).toHaveTextContent("Kept");
  });

  it("replaces the state when the snapshot is newer", async () => {
    render(<Probe initial={makeVenueState({ seq: 5 })} />);
    await waitFor(() => expect(captured.options).not.toBeNull());
    const snapshot: ServerEvent = {
      ...envelope,
      seq: 9,
      type: "state.snapshot",
      data: makeVenueState({
        seq: 9,
        queue: [makeRequest({ id: "b", status: "accepted", title: "Fresh" })],
      }),
    };
    act(() => captured.options?.onEvent(snapshot));
    expect(screen.getByTestId("queue")).toHaveTextContent("Fresh");
  });

  it("loads the state over http when the server could not render it", async () => {
    render(<Probe initial={null} />);
    await waitFor(() => expect(screen.getByTestId("seq")).toHaveTextContent("99"));
  });

  it("polls over http while the socket is down", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Probe initial={makeVenueState({ seq: 1 })} />);
    expect(screen.getByTestId("seq")).toHaveTextContent("1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21_000);
    });
    await waitFor(() => expect(screen.getByTestId("seq")).toHaveTextContent("99"));
  });
});
