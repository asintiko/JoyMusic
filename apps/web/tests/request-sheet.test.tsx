import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@joymusic/shared";
import { RequestSheet, type RequestTarget } from "@/guest/request-sheet";
import { makeRequest, makeTrack } from "./helpers";
import { renderWithI18n } from "./render";

const trackTarget: RequestTarget = { mode: "track", track: makeTrack() };

function mount(options: {
  target?: RequestTarget;
  allowNotes?: boolean;
  submit?: (
    payload: never,
  ) => Promise<{ request: ReturnType<typeof makeRequest>; merged: boolean }>;
  onSuccess?: () => void;
}) {
  const submit = options.submit ?? vi.fn(async () => ({ request: makeRequest(), merged: false }));
  const onSuccess = options.onSuccess ?? vi.fn();
  renderWithI18n(
    <RequestSheet
      target={options.target ?? trackTarget}
      open
      onOpenChange={() => undefined}
      allowNotes={options.allowNotes ?? true}
      submit={submit as never}
      onSuccess={onSuccess}
    />,
  );
  return { submit, onSuccess };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("RequestSheet", () => {
  it("submits the track with a trimmed dedication and note", async () => {
    const user = userEvent.setup();
    const { submit, onSuccess } = mount({});
    await user.type(screen.getByRole("textbox", { name: /who is it for/i }), "  Aziz ");
    await user.type(screen.getByRole("textbox", { name: /note to the dj/i }), "Happy birthday");
    await user.click(screen.getByTestId("request-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledWith({
      track: trackTarget.mode === "track" ? trackTarget.track : undefined,
      note: "Happy birthday",
      dedicatedTo: "Aziz",
    });
  });

  it("hides note fields when the venue disallows notes", () => {
    mount({ allowNotes: false });
    expect(screen.queryByRole("textbox", { name: /who is it for/i })).toBeNull();
    expect(screen.queryByRole("textbox", { name: /note to the dj/i })).toBeNull();
  });

  it("requires artist and title for text requests", async () => {
    const user = userEvent.setup();
    const { submit } = mount({
      target: { mode: "text", artist: "", title: "" },
      allowNotes: false,
    });
    const button = screen.getByTestId("request-submit");
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Artist" }), "Shahzoda");
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Track title" }), "Yomgir");
    expect(button).toBeEnabled();
    await user.click(button);
    expect(submit).toHaveBeenCalledWith({
      freeText: { artist: "Shahzoda", title: "Yomgir" },
      note: undefined,
      dedicatedTo: undefined,
    });
  });

  it("prefills text requests from the search query", () => {
    mount({ target: { mode: "text", artist: "Shahzoda", title: "Yomgir" } });
    expect(screen.getByRole("textbox", { name: "Artist" })).toHaveValue("Shahzoda");
    expect(screen.getByRole("textbox", { name: "Track title" })).toHaveValue("Yomgir");
  });

  it("shows the limit message with a live countdown, then unlocks", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => {
      throw new ApiError(429, "request_limit_reached", "limit", {
        limit: 3,
        windowMinutes: 30,
        retryAfterSeconds: 2,
      });
    });
    mount({ submit: submit as never });
    await user.click(screen.getByTestId("request-submit"));
    const alert = await screen.findByTestId("request-failure");
    expect(alert).toHaveAttribute("data-failure", "limit");
    expect(alert).toHaveTextContent("3");
    expect(screen.getByTestId("request-submit")).toBeDisabled();
    expect(screen.getByTestId("request-submit")).toHaveTextContent(/Try again in 0:0[12]/);
    await waitFor(() => expect(screen.queryByTestId("request-failure")).toBeNull(), {
      timeout: 4000,
    });
    expect(screen.getByTestId("request-submit")).toBeEnabled();
  });

  it.each([
    ["requests_closed", 403, "closed", /closed for now/i],
    ["no_active_session", 409, "no_session", /hasn’t started/i],
    ["content_blocked", 422, "blocked", /not accepted/i],
  ])("shows a friendly message for %s", async (code, status, kind, text) => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => {
      throw new ApiError(
        status,
        code,
        "nope",
        code === "content_blocked" ? { field: "note" } : undefined,
      );
    });
    mount({ submit: submit as never });
    await user.click(screen.getByTestId("request-submit"));
    const alert = await screen.findByTestId("request-failure");
    expect(alert).toHaveAttribute("data-failure", kind);
    expect(alert).toHaveTextContent(text);
    if (kind === "closed" || kind === "no_session") {
      expect(screen.getByTestId("request-submit")).toBeDisabled();
    } else {
      expect(screen.getByTestId("request-submit")).toBeEnabled();
    }
  });

  it("treats a dropped connection as a retryable network error", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    mount({ submit: submit as never });
    await user.click(screen.getByTestId("request-submit"));
    expect(await screen.findByTestId("request-failure")).toHaveAttribute("data-failure", "network");
    expect(screen.getByTestId("request-submit")).toBeEnabled();
  });

  it("localises the form", () => {
    renderWithI18n(
      <RequestSheet
        target={trackTarget}
        open
        onOpenChange={() => undefined}
        allowNotes
        submit={vi.fn() as never}
        onSuccess={() => undefined}
      />,
      "ru",
    );
    expect(screen.getByText("Кому посвящаем?")).toBeInTheDocument();
    expect(screen.getByTestId("request-submit")).toHaveTextContent("Заказать");
  });
});
