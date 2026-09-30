import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageScreen } from "../../src/renderer/features/stage/stage-screen";
import { buildStageConfig } from "../../src/renderer/state/stage-control";
import { installFakeBridge, makeRequest, makeState } from "./support/fake-bridge";
import { renderScreen } from "./support/render";

const config = (locale: "uz" | "ru" | "en" = "en") =>
  buildStageConfig(makeState().venue, "https://joymusic.uz", locale, "venue");

describe("stage screen", () => {
  it("waits for the console when no venue is configured", async () => {
    const bridge = installFakeBridge();
    await bridge.settings.update({ locale: "en" });
    await renderScreen(<StageScreen />);
    expect(screen.getByTestId("stage-waiting")).toBeInTheDocument();
    expect(screen.getByText("Waiting for the console")).toBeInTheDocument();
  });

  it("shows the idle call to action with a real QR when nothing plays", async () => {
    const bridge = installFakeBridge();
    bridge.setTopic("stageConfig", config());
    bridge.pushRealtime(makeState());
    await renderScreen(<StageScreen />);
    const stage = await screen.findByTestId("stage");
    expect(stage).toHaveAttribute("data-idle", "true");
    expect(within(stage).getByTestId("stage-idle")).toHaveTextContent("Order a track");
    expect(within(stage).getByTestId("stage-url")).toHaveTextContent("joymusic.uz/v/joy-demo-club");
    const qr = within(stage).getByTestId("stage-qr") as HTMLImageElement;
    expect(qr.src.startsWith("data:image/svg+xml")).toBe(true);
    expect(within(stage).getByText("Requests open")).toBeInTheDocument();
  });

  it("shows the hero, what is up next and dedications, without any controls", async () => {
    const bridge = installFakeBridge();
    bridge.setTopic("stageConfig", config());
    const state = makeState({
      nowPlaying: {
        title: "Sevaman",
        artist: "Shahzoda",
        artworkUrl: null,
        track: null,
        startedAt: new Date().toISOString(),
        durationSec: 214,
        bpm: 96,
        key: "8A",
        source: "serato",
        requestId: null,
        dedicatedTo: "Aziz",
      },
      queue: [
        makeRequest("q1", {
          status: "accepted",
          position: 1,
          title: "Yulduzlar",
          dedicatedTo: "Madina",
        }),
        makeRequest("q2", { status: "accepted", position: 2, title: "Oydin kecha" }),
        makeRequest("q3", { status: "accepted", position: 3, title: "Levitating" }),
      ],
    });
    bridge.pushRealtime(state);
    await renderScreen(<StageScreen />);
    const stage = await screen.findByTestId("stage");
    expect(stage).toHaveAttribute("data-idle", "false");
    expect(within(stage).getByText("Sevaman")).toBeInTheDocument();
    expect(within(stage).getByText("Shahzoda")).toBeInTheDocument();
    expect(within(stage).getByText("For Aziz")).toBeInTheDocument();
    expect(within(stage).getByText("Yulduzlar")).toBeInTheDocument();
    expect(within(stage).getByText("Dedications")).toBeInTheDocument();
    expect(within(stage).queryAllByRole("button")).toHaveLength(0);
    expect(within(stage).queryAllByRole("textbox")).toHaveLength(0);
  });

  it("marks paused requests and follows the configured language", async () => {
    const bridge = installFakeBridge();
    bridge.setTopic("stageConfig", config("ru"));
    const state = makeState();
    state.venue.settings.requestsOpen = false;
    bridge.pushRealtime(state);
    await renderScreen(<StageScreen />);
    const stage = await screen.findByTestId("stage");
    expect(within(stage).getByText("Приём на паузе")).toBeInTheDocument();
    expect(within(stage).getAllByText("Закажи трек").length).toBeGreaterThan(0);
    act(() => bridge.setTopic("stageConfig", config("uz")));
    expect(await within(stage).findByText("Buyurtmalar toʻxtatilgan")).toBeInTheDocument();
  });

  it("subscribes as the anonymous tv role", async () => {
    const bridge = installFakeBridge();
    bridge.setTopic("stageConfig", config());
    await renderScreen(<StageScreen />);
    await screen.findByTestId("stage");
    expect(bridge.targets).toContainEqual({ venue: "joy-demo-club", role: "tv" });
  });
});
