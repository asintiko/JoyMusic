import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SuggestionSection } from "@joymusic/shared";
import { clearSuggestionsCache } from "@/guest/suggestions-cache";
import { makeTrack, makeVenueState } from "./helpers";
import { renderWithI18n } from "./render";

const searchCalls: string[] = [];
let searchImpl: (query: string) => Promise<ReturnType<typeof makeTrack>[]>;

vi.mock("@/guest/api", () => ({
  createAbortableApi: () => ({
    call: async (_name: string, input: { query: { q: string } }) => {
      searchCalls.push(input.query.q);
      return { tracks: await searchImpl(input.query.q) };
    },
  }),
  createGuestApi: () => ({}),
}));

const sections: SuggestionSection[] = [
  { id: "uz_hits", tracks: [makeTrack({ id: "s1", title: "Suggested one" })] },
  { id: "club", tracks: [makeTrack({ id: "s2", title: "Club banger" })] },
];

const api = {
  call: vi.fn(async () => ({ sections })),
};

async function mountOverlay(
  props: Partial<{ allowFreeText: boolean; requestsOpen: boolean }> = {},
) {
  const { SearchOverlay } = await import("@/guest/search-overlay");
  const onRequest = vi.fn();
  const onRequestText = vi.fn();
  renderWithI18n(
    <SearchOverlay
      slug="joy-demo-club"
      api={api as never}
      venue={makeVenueState()}
      mine={{}}
      allowFreeText={props.allowFreeText ?? true}
      requestsOpen={props.requestsOpen ?? true}
      onClose={() => undefined}
      onRequest={onRequest}
      onRequestText={onRequestText}
    />,
  );
  return { onRequest, onRequestText };
}

beforeEach(() => {
  searchCalls.length = 0;
  window.localStorage.clear();
  searchImpl = async (query) => [makeTrack({ id: `id:${query}`, title: `Result for ${query}` })];
  api.call.mockClear();
  clearSuggestionsCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SearchOverlay", () => {
  it("shows suggestion chips and the first section", async () => {
    await mountOverlay();
    expect(await screen.findByText("Suggested one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Uzbek hits" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    expect(await screen.findByText("Club banger")).toBeInTheDocument();
  });

  it("debounces typing into a single catalog request", async () => {
    await mountOverlay();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "sh" } });
    fireEvent.change(input, { target: { value: "sha" } });
    fireEvent.change(input, { target: { value: "shahzoda" } });
    expect(searchCalls).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(searchCalls).toEqual(["shahzoda"]);
    expect(await screen.findByText("Result for shahzoda")).toBeInTheDocument();
    expect(screen.getByTestId("search-count")).toHaveTextContent("Found · 1");
  });

  it("shows a transliteration hint", async () => {
    await mountOverlay();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Shahzoda" } });
    expect(await screen.findByText(/Shahzoda ↔ Шахзода/)).toBeInTheDocument();
  });

  it("offers request-by-text when nothing is found and prefills artist and title", async () => {
    searchImpl = async () => [];
    const { onRequestText } = await mountOverlay();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ozoda - Tasalli ber" } });
    expect(await screen.findByText("Nothing found")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("request-by-text"));
    expect(onRequestText).toHaveBeenCalledWith({ artist: "Ozoda", title: "Tasalli ber" });
  });

  it("hides request-by-text when the venue disallows it", async () => {
    searchImpl = async () => [];
    await mountOverlay({ allowFreeText: false });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nothing here" } });
    await screen.findByText("Nothing found");
    expect(screen.queryByTestId("request-by-text")).toBeNull();
  });

  it("shows an error state and retries", async () => {
    let attempt = 0;
    searchImpl = async (query) => {
      attempt += 1;
      if (attempt === 1) throw new Error("503");
      return [makeTrack({ id: "ok", title: `Recovered ${query}` })];
    };
    await mountOverlay();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "shahzoda" } });
    expect(await screen.findByText("Search is unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Recovered shahzoda")).toBeInTheDocument();
  });

  it("requests a track and remembers the query", async () => {
    const { onRequest } = await mountOverlay();
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "shahzoda" } });
    const add = await screen.findByRole("button", { name: /Request: Result for shahzoda/ });
    fireEvent.click(add);
    expect(onRequest).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("jm:recent-searches") ?? "[]")).toEqual([
        "shahzoda",
      ]),
    );
  });

  it("lists recent searches and reruns one", async () => {
    window.localStorage.setItem("jm:recent-searches", JSON.stringify(["Ozoda", "Shohruh"]));
    await mountOverlay();
    const recent = screen.getAllByTestId("recent-search");
    expect(recent.map((node) => node.textContent)).toEqual(["Ozoda", "Shohruh"]);
    fireEvent.click(recent[0] as HTMLElement);
    expect(await screen.findByText("Result for Ozoda")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("Ozoda");
  });

  it("disables requests while the venue is closed", async () => {
    await mountOverlay({ requestsOpen: false });
    const add = await screen.findByRole("button", { name: /Request: Yomg/ }).catch(() => null);
    if (add) expect(add).toBeDisabled();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "shahzoda" } });
    const button = await screen.findByRole("button", { name: /Request: Result for shahzoda/ });
    expect(button).toBeDisabled();
  });
});
