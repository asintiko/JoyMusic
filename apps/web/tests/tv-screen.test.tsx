import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TvScreen } from "@/tv/tv-screen";
import { makeRequest, makeVenueState } from "./helpers";

vi.mock("@/lib/shared-runtime", () => ({
  loadShared: async () => ({
    createRealtimeClient: () => ({
      start: () => undefined,
      stop: () => undefined,
      resync: () => undefined,
    }),
    createApiClient: () => ({ call: async () => makeVenueState() }),
  }),
}));

const qrSvg =
  '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

const playing = {
  title: "Yomgir",
  artist: "Shahzoda",
  artworkUrl: null,
  track: null,
  startedAt: new Date(Date.now() - 30_000).toISOString(),
  durationSec: 200,
  bpm: 118,
  key: "8A",
  source: "request" as const,
  requestId: null,
  dedicatedTo: "Aziz",
};

function mount(state = makeVenueState({ nowPlaying: playing }), locale: "uz" | "ru" | "en" = "en") {
  return render(
    <TvScreen
      slug="joy-demo-club"
      initial={state}
      locale={locale}
      theme="club"
      qrSvg={qrSvg}
      displayUrl="joymusic.uz/v/joy-demo-club"
      backdrop="/backdrop.webp"
    />,
  );
}

describe("TvScreen", () => {
  it("shows the hero, the dedication, the QR code and the join url while a track plays", () => {
    mount();
    expect(screen.getByTestId("tv-root")).toHaveAttribute("data-mode", "playing");
    expect(screen.getByRole("heading", { name: "Yomgir" })).toBeInTheDocument();
    expect(screen.getByText("For Aziz")).toBeInTheDocument();
    expect(screen.getByTestId("tv-qr").querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("tv-qr")).toHaveAttribute(
      "aria-label",
      "joymusic.uz/v/joy-demo-club",
    );
    expect(screen.getByTestId("tv-status")).toHaveTextContent("Requests open");
  });

  it("lists upcoming tracks and dedications of queued requests only", () => {
    mount(
      makeVenueState({
        nowPlaying: playing,
        queue: [
          makeRequest({
            id: "a",
            status: "accepted",
            title: "Blinding Lights",
            dedicatedTo: "Madina",
          }),
          makeRequest({ id: "b", status: "accepted", title: "Levitating" }),
        ],
        pending: [makeRequest({ id: "c", title: "Secret", dedicatedTo: "Hidden" })],
      }),
    );
    expect(screen.getByTestId("tv-upcoming")).toHaveTextContent("Blinding Lights");
    expect(screen.getByTestId("tv-dedication")).toHaveTextContent("For Madina");
    expect(screen.queryByText(/Hidden/)).toBeNull();
  });

  it("switches to the idle mode when nothing plays", () => {
    mount(makeVenueState());
    expect(screen.getByTestId("tv-root")).toHaveAttribute("data-mode", "idle");
    expect(screen.getByTestId("tv-idle-title")).toHaveTextContent("You pick the music");
  });

  it("shows the waiting mode without a session and localises the copy", () => {
    mount(makeVenueState({ session: null }), "ru");
    expect(screen.getByTestId("tv-root")).toHaveAttribute("data-mode", "waiting");
    expect(screen.getByTestId("tv-idle-title")).toHaveTextContent("Диджей скоро начнёт");
    expect(screen.queryByTestId("tv-status")).toBeNull();
  });

  it("shows the closed status when the DJ paused requests", () => {
    const state = makeVenueState({ nowPlaying: playing });
    state.venue.settings.requestsOpen = false;
    mount(state);
    expect(screen.getByTestId("tv-status")).toHaveTextContent("Requests closed");
  });
});
