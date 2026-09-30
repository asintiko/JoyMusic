import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "../src/lib/api";
import { VenueScopeProvider } from "../src/lib/venue-scope";
import { ModerationPage, normalizeWord } from "../src/pages/moderation/moderation-page";
import { apiStub, authFixture, errorResponse, jsonResponse, venueFixture } from "./helpers";
import { renderRoute } from "./router-helpers";

const word = (id: string, text: string) => ({
  id,
  word: text,
  createdAt: "2026-09-01T00:00:00.000Z",
});

beforeEach(() => {
  session.signIn(authFixture());
});

afterEach(() => {
  vi.unstubAllGlobals();
  session.expire();
});

function renderModeration() {
  return renderRoute(
    <VenueScopeProvider>
      <ModerationPage />
    </VenueScopeProvider>,
    { path: "/moderation" },
  );
}

describe("normalizeWord", () => {
  it("trims, collapses spaces and lowercases", () => {
    expect(normalizeWord("  Bad   WORD ")).toBe("bad word");
  });
});

describe("ModerationPage banned words", () => {
  it("lists, adds and removes words", async () => {
    let words = [word("w1", "jalab")];
    const { mock, calls } = apiStub({
      "GET /v1/admin/venues": () => jsonResponse({ venues: [venueFixture] }),
      "GET /v1/admin/moderation/words": () => jsonResponse({ words }),
      "POST /v1/admin/moderation/words": ({ body }) => {
        const created = word("w2", (body as { word: string }).word);
        words = [created, ...words];
        return jsonResponse(created, 201);
      },
      "DELETE /v1/admin/moderation/words/w1": () => {
        words = words.filter((entry) => entry.id !== "w1");
        return jsonResponse({ ok: true });
      },
    });
    vi.stubGlobal("fetch", mock);
    await renderModeration();

    expect(await screen.findByText("jalab")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Add a banned word"), "  Qahba ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("qahba")).toBeInTheDocument();
    const post = calls.find((entry) => entry.key === "POST /v1/admin/moderation/words");
    expect(post?.body).toEqual({ word: "qahba" });

    await userEvent.click(screen.getByRole("button", { name: "Remove jalab" }));
    await waitFor(() => expect(screen.queryByText("jalab")).not.toBeInTheDocument());
  });

  it("rejects duplicates and too short words without calling the API", async () => {
    const { mock, calls } = apiStub({
      "GET /v1/admin/venues": () => jsonResponse({ venues: [venueFixture] }),
      "GET /v1/admin/moderation/words": () => jsonResponse({ words: [word("w1", "jalab")] }),
    });
    vi.stubGlobal("fetch", mock);
    await renderModeration();
    await screen.findByText("jalab");
    const input = screen.getByLabelText("Add a banned word");
    await userEvent.type(input, "a");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("At least 2 characters")).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "JALAB");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("This word is already in the list")).toBeInTheDocument();
    expect(calls.some((entry) => entry.key.startsWith("POST"))).toBe(false);
  });

  it("rolls back an optimistic add when the server refuses", async () => {
    const { mock } = apiStub({
      "GET /v1/admin/venues": () => jsonResponse({ venues: [venueFixture] }),
      "GET /v1/admin/moderation/words": () => jsonResponse({ words: [] }),
      "POST /v1/admin/moderation/words": () => errorResponse(403, "forbidden"),
    });
    vi.stubGlobal("fetch", mock);
    await renderModeration();
    await screen.findByText("No custom words yet");
    await userEvent.type(screen.getByLabelText("Add a banned word"), "zzz");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByText("You do not have permission for this action."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("banned-word")).not.toBeInTheDocument();
  });
});

describe("ModerationPage device ban", () => {
  it("confirms before banning and posts the device id", async () => {
    const { mock, calls } = apiStub({
      "GET /v1/admin/venues": () => jsonResponse({ venues: [venueFixture] }),
      "GET /v1/admin/moderation/words": () => jsonResponse({ words: [] }),
      "POST /v1/admin/venues/ven_1/devices/d-4f3a91c0b27e/ban": () => jsonResponse({ ok: true }),
    });
    vi.stubGlobal("fetch", mock);
    await renderModeration();
    await screen.findByText("No custom words yet");
    const banButton = screen.getByRole("button", { name: "Ban device" });
    expect(banButton).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Device ID"), "d-4f3a91c0b27e");
    expect(banButton).toBeEnabled();
    await userEvent.click(banButton);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Ban device" }));
    await waitFor(() => expect(calls.some((entry) => entry.key.endsWith("/ban"))).toBe(true));
  });
});
