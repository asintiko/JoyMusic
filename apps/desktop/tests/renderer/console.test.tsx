import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ConsoleScreen } from "../../src/renderer/features/console/console-screen";
import { handleQueueDragEnd } from "../../src/renderer/features/console/queue-panel";
import { installFakeBridge, makeRequest, makeState } from "./support/fake-bridge";
import type { FakeBridge } from "./support/fake-bridge";
import { renderScreen } from "./support/render";

let bridge: FakeBridge;

const populated = () =>
  makeState({
    pending: [
      makeRequest("p1", {
        votes: 3,
        dedicatedTo: "Aziz",
        note: "Happy birthday",
        title: "Blinding Lights",
      }),
      makeRequest("p2", { title: "Levitating" }),
      makeRequest("p3", { title: "Titanium" }),
    ],
    queue: [
      makeRequest("q1", { status: "accepted", position: 1, title: "Kechqurun" }),
      makeRequest("q2", { status: "accepted", position: 2, title: "Yulduzlar" }),
      makeRequest("q3", { status: "accepted", position: 3, title: "Sweet Dreams" }),
    ],
  });

async function mount(state = populated()) {
  bridge = installFakeBridge();
  bridge.pushRealtime(state);
  await renderScreen(<ConsoleScreen />);
  await screen.findByTestId("console");
  return bridge;
}

const card = (id: string) => document.querySelector(`[data-request-id="${id}"]`) as HTMLElement;
const row = (id: string) => document.querySelector(`[data-queue-id="${id}"]`) as HTMLElement;
const queueIds = () =>
  Array.from(document.querySelectorAll("[data-queue-id]")).map((node) =>
    node.getAttribute("data-queue-id"),
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe("incoming requests", () => {
  it("lists pending requests with votes, dedication and note", async () => {
    await mount();
    expect(document.querySelectorAll("[data-request-id]")).toHaveLength(3);
    const first = within(card("p1"));
    expect(first.getByText("Blinding Lights")).toBeInTheDocument();
    expect(first.getByText("For Aziz")).toBeInTheDocument();
    expect(first.getByText("Happy birthday")).toBeInTheDocument();
    expect(screen.getByTestId("incoming-count")).toHaveTextContent("3");
  });

  it("accepts a request", async () => {
    await mount();
    await userEvent.click(within(card("p2")).getByRole("button", { name: /accept/i }));
    expect(bridge.commandLog).toEqual([{ kind: "accept", requestId: "p2" }]);
  });

  it("declines with a reason from the dialog", async () => {
    await mount();
    await userEvent.click(within(card("p3")).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Already played tonight" }));
    await userEvent.click(within(dialog).getByTestId("decline-confirm"));
    expect(bridge.commandLog).toEqual([
      { kind: "decline", requestId: "p3", reason: "Already played tonight" },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("declines without a reason when none is typed", async () => {
    await mount();
    await userEvent.click(within(card("p3")).getByRole("button", { name: "Decline" }));
    await userEvent.click(await screen.findByTestId("decline-confirm"));
    expect(bridge.commandLog).toEqual([{ kind: "decline", requestId: "p3" }]);
  });

  it("moves a request to Later and brings it back from the All tab", async () => {
    await mount();
    await userEvent.click(within(card("p1")).getByRole("button", { name: "Later" }));
    expect(card("p1")).toBeNull();
    expect(bridge.commandLog).toEqual([]);
    await userEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(card("p1")).not.toBeNull();
    await userEvent.click(within(card("p1")).getByRole("button", { name: "Back to new" }));
    await userEvent.click(screen.getByRole("tab", { name: "New" }));
    expect(card("p1")).not.toBeNull();
  });

  it("shows friendly empty states", async () => {
    await mount(makeState());
    expect(screen.getByText("No new requests")).toBeInTheDocument();
    expect(screen.getByText("The queue is empty")).toBeInTheDocument();
    expect(screen.getByText("Nothing is playing")).toBeInTheDocument();
  });

  it("explains a paused inbox and can reopen it", async () => {
    const state = makeState();
    state.venue.settings.requestsOpen = false;
    await mount(state);
    expect(screen.getByText("Requests are paused")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept requests" }));
    expect(bridge.commandLog).toEqual([
      { kind: "settings", sessionId: "ses_1", patch: { requestsOpen: true } },
    ]);
  });
});

describe("keyboard shortcuts", () => {
  it("A accepts the selected request and arrow keys change the selection", async () => {
    await mount();
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "a" });
    expect(bridge.commandLog).toEqual([
      { kind: "accept", requestId: "p1" },
      { kind: "accept", requestId: "p2" },
    ]);
  });

  it("D opens the decline dialog and Escape closes it", async () => {
    await mount();
    fireEvent.keyDown(window, { key: "d" });
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Blinding Lights - Artist p1")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bridge.commandLog).toEqual([]);
  });

  it("L defers the selected request without calling the server", async () => {
    await mount();
    fireEvent.keyDown(window, { key: "l" });
    expect(card("p1")).toBeNull();
    expect(bridge.commandLog).toEqual([]);
  });

  it("Space puts the top of the queue on air and P marks the current track played", async () => {
    await mount();
    fireEvent.keyDown(window, { key: " " });
    expect(bridge.commandLog).toEqual([{ kind: "play", requestId: "q1" }]);
    const onAir = populated();
    onAir.queue = onAir.queue.slice(1);
    onAir.nowPlaying = {
      title: "Kechqurun",
      artist: "Artist q1",
      artworkUrl: null,
      track: null,
      startedAt: "2026-09-30T10:00:00.000Z",
      durationSec: 180,
      bpm: null,
      key: null,
      source: "request",
      requestId: "q1",
      dedicatedTo: null,
    };
    act(() => bridge.pushRealtime(onAir));
    await screen.findByTestId("now-playing");
    fireEvent.keyDown(window, { key: "p" });
    expect(bridge.commandLog.at(-1)).toEqual({ kind: "played", requestId: "q1" });
  });

  it("ignores shortcuts while typing in a field", async () => {
    await mount();
    await userEvent.click(within(card("p3")).getByRole("button", { name: "Decline" }));
    const field = await screen.findByTestId("decline-reason");
    await userEvent.type(field, "a d l");
    expect(bridge.commandLog).toEqual([]);
  });

  it("Alt+Arrow reorders the selected queue item", async () => {
    await mount();
    await userEvent.click(row("q2"));
    fireEvent.keyDown(window, { key: "ArrowUp", altKey: true });
    expect(bridge.commandLog).toEqual([
      { kind: "reorder", sessionId: "ses_1", order: ["q2", "q1", "q3"] },
    ]);
    await waitFor(() => expect(queueIds()).toEqual(["q2", "q1", "q3"]));
  });
});

describe("queue reordering", () => {
  it("turns a drop into the new full order", () => {
    const seen: string[][] = [];
    const moved = handleQueueDragEnd(
      ["q1", "q2", "q3"],
      { active: { id: "q3" }, over: { id: "q1" } } as never,
      (order) => seen.push(order),
    );
    expect(moved).toBe(true);
    expect(seen).toEqual([["q3", "q1", "q2"]]);
  });

  it("ignores drops on the same row or outside the list", () => {
    const seen: string[][] = [];
    const push = (order: string[]) => seen.push(order);
    expect(
      handleQueueDragEnd(["a", "b"], { active: { id: "a" }, over: { id: "a" } } as never, push),
    ).toBe(false);
    expect(handleQueueDragEnd(["a", "b"], { active: { id: "a" }, over: null } as never, push)).toBe(
      false,
    );
    expect(seen).toEqual([]);
  });

  it("keeps the new order on screen right away, before the server confirms", async () => {
    await mount();
    await userEvent.click(row("q3"));
    fireEvent.keyDown(window, { key: "ArrowUp", altKey: true });
    await waitFor(() => expect(queueIds()).toEqual(["q1", "q3", "q2"]));
  });

  it("updates when the server pushes a different order", async () => {
    await mount();
    const next = populated();
    next.queue = [next.queue[2]!, next.queue[0]!, next.queue[1]!].map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    act(() => bridge.pushRealtime(next));
    await waitFor(() => expect(queueIds()).toEqual(["q3", "q1", "q2"]));
  });
});

describe("connection state", () => {
  it("shows no banner while everything is fine", async () => {
    await mount();
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("shows a clear offline banner with the number of saved actions", async () => {
    await mount();
    act(() => {
      bridge.setTopic("net", { online: false, latencyMs: null, checkedAt: 1 });
      bridge.setTopic("outbox", {
        pending: 2,
        flushing: false,
        lastSkipped: null,
        entries: [
          {
            id: "1",
            kind: "accept",
            command: { kind: "accept", requestId: "p1" },
            createdAt: 1,
            attempts: 1,
          },
          {
            id: "2",
            kind: "decline",
            command: { kind: "decline", requestId: "p2" },
            createdAt: 2,
            attempts: 0,
          },
        ],
      });
    });
    const banner = await screen.findByTestId("offline-banner");
    expect(banner).toHaveAttribute("data-mode", "offline");
    expect(banner).toHaveTextContent("No connection");
    expect(banner).toHaveTextContent("saved (2)");
    expect(screen.getByTestId("outbox-chip")).toHaveTextContent("2 waiting to send");
    expect(card("p1")).toBeNull();
    expect(row("p1")).not.toBeNull();
    expect(card("p2")).toBeNull();
    await userEvent.click(within(banner).getByRole("button", { name: "Retry now" }));
    expect(bridge.retryOutbox).toHaveBeenCalledTimes(1);
  });

  it("offers a soft reconnecting state when only the socket is down", async () => {
    await mount();
    act(() => bridge.pushRealtime(populated(), "closed"));
    const banner = await screen.findByTestId("offline-banner");
    expect(banner).toHaveAttribute("data-mode", "reconnecting");
    expect(screen.getByTestId("realtime-chip")).toHaveAttribute("data-state", "closed");
  });

  it("hides the banner again after the connection returns and the outbox drains", async () => {
    await mount();
    act(() => bridge.setTopic("net", { online: false, latencyMs: null, checkedAt: 1 }));
    await screen.findByTestId("offline-banner");
    act(() => bridge.setTopic("net", { online: true, latencyMs: 20, checkedAt: 2 }));
    await waitFor(() => expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument());
    expect(screen.getByTestId("latency-chip")).toHaveTextContent("20 ms");
  });
});

describe("now playing and status", () => {
  it("shows the detected track with its source and hardware chips", async () => {
    const state = populated();
    state.nowPlaying = {
      title: "Sevaman",
      artist: "Shahzoda",
      artworkUrl: null,
      track: null,
      startedAt: "2026-09-30T09:59:30.000Z",
      durationSec: 214,
      bpm: 96,
      key: "8A",
      source: "serato",
      requestId: null,
      dedicatedTo: null,
    };
    await mount(state);
    act(() =>
      bridge.setTopic("adapters", {
        detected: null,
        adapters: [
          {
            id: "serato",
            label: "Serato DJ Pro",
            source: "serato",
            enabled: true,
            status: { state: "active", detail: null, since: 1 },
            current: null,
          },
        ],
      }),
    );
    const panel = await screen.findByTestId("now-playing");
    expect(within(panel).getByText("Sevaman")).toBeInTheDocument();
    expect(within(panel).getByText("Detected from Serato")).toBeInTheDocument();
    expect(await screen.findByTestId("adapter-chip-serato")).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("toggles requests open and closed from the top bar", async () => {
    await mount();
    await userEvent.click(screen.getByTestId("requests-open-switch"));
    expect(bridge.commandLog).toEqual([
      { kind: "settings", sessionId: "ses_1", patch: { requestsOpen: false } },
    ]);
  });
});
