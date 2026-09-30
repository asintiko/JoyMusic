import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrackResult } from "@/guest/track-result";
import { UpNext } from "@/guest/up-next";
import { MyRequestsSheet } from "@/guest/my-requests-sheet";
import { makeRequest, makeTrack } from "./helpers";
import { renderWithI18n } from "./render";

const idlePreview = { trackId: null, status: "idle", progress: 0 } as const;

describe("TrackResult", () => {
  it("requests and previews a track", async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    const onPreview = vi.fn();
    const track = makeTrack({ previewUrl: "https://cdn/preview.mp3" });
    renderWithI18n(
      <TrackResult
        track={track}
        preview={idlePreview}
        requested={false}
        queueStatus={null}
        onRequest={onRequest}
        onPreview={onPreview}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Request: Yomg/ }));
    expect(onRequest).toHaveBeenCalledWith(track);
    await user.click(screen.getByRole("button", { name: /play 30 second preview/i }));
    expect(onPreview).toHaveBeenCalledWith(track);
  });

  it("marks the playing preview and hides the button without a preview url", () => {
    const track = makeTrack({ previewUrl: null });
    renderWithI18n(
      <TrackResult
        track={track}
        preview={{ trackId: track.id, status: "playing", progress: 0.4 }}
        requested
        queueStatus="accepted"
        onRequest={() => undefined}
        onPreview={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: /preview/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Already requested" })).toBeDisabled();
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("shows the preview as pressed while playing", () => {
    const track = makeTrack({ previewUrl: "https://cdn/p.mp3" });
    renderWithI18n(
      <TrackResult
        track={track}
        preview={{ trackId: track.id, status: "playing", progress: 0.5 }}
        requested={false}
        queueStatus={null}
        onRequest={() => undefined}
        onPreview={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /stop preview/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("UpNext", () => {
  it("lists the queue and pending sections and lets guests vote", async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    const pending = makeRequest({ id: "p1", title: "Levitating", votes: 3 });
    renderWithI18n(
      <UpNext
        queue={[makeRequest({ id: "q1", status: "accepted", title: "Kelinchik", position: 1 })]}
        pending={[pending]}
        canVote
        onVote={onVote}
        votingId={null}
      />,
    );
    expect(screen.getByTestId("up-next")).toHaveTextContent("Kelinchik");
    expect(screen.getByTestId("pending-list")).toHaveTextContent("Levitating");
    await user.click(screen.getByRole("button", { name: "Vote: Levitating" }));
    expect(onVote).toHaveBeenCalledWith(pending);
  });

  it("shows a badge instead of a vote button for my own requests", () => {
    renderWithI18n(
      <UpNext
        queue={[makeRequest({ id: "q1", status: "accepted", mine: true })]}
        pending={[]}
        canVote
        onVote={() => undefined}
        votingId={null}
      />,
    );
    expect(screen.getByTestId("mine-badge")).toHaveTextContent("Yours");
    expect(screen.queryByTestId("vote-button")).toBeNull();
  });

  it("hides voting when requests are closed", () => {
    renderWithI18n(
      <UpNext
        queue={[makeRequest({ id: "q1", status: "accepted" })]}
        pending={[]}
        canVote={false}
        onVote={() => undefined}
        votingId={null}
      />,
    );
    expect(screen.queryByTestId("vote-button")).toBeNull();
  });

  it("renders the empty queue message", () => {
    renderWithI18n(
      <UpNext queue={[]} pending={[]} canVote onVote={() => undefined} votingId={null} />,
    );
    expect(screen.getByText("The queue is empty")).toBeInTheDocument();
  });
});

describe("MyRequestsSheet", () => {
  it("shows live statuses, queue position and the decline reason", () => {
    const mine = {
      a: makeRequest({ id: "a", title: "One", status: "accepted" }),
      b: makeRequest({ id: "b", title: "Two", status: "declined", declineReason: "Not tonight" }),
      c: makeRequest({ id: "c", title: "Three", status: "playing" }),
    };
    renderWithI18n(
      <MyRequestsSheet open onOpenChange={() => undefined} mine={mine} queueOrder={["x", "a"]} />,
    );
    const items = screen.getAllByTestId("my-request");
    expect(items.map((item) => item.getAttribute("data-status"))).toEqual([
      "playing",
      "accepted",
      "declined",
    ]);
    expect(screen.getByText("Playing now")).toBeInTheDocument();
    expect(screen.getByText("Queued · #2")).toBeInTheDocument();
    expect(screen.getByText(/Not tonight/)).toBeInTheDocument();
  });

  it("explains the empty state", () => {
    renderWithI18n(
      <MyRequestsSheet open onOpenChange={() => undefined} mine={{}} queueOrder={[]} />,
    );
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
  });
});
