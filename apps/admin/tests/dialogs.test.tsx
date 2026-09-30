import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../src/components/confirm-dialog";
import { session } from "../src/lib/api";
import { DesktopAuthorizePage, parseDesktopParams } from "../src/pages/auth/desktop-authorize-page";
import { DjNoticePage } from "../src/pages/auth/dj-notice-page";
import { apiStub, authFixture, errorResponse, jsonResponse, meFixture } from "./helpers";
import { renderRoute } from "./router-helpers";
import { renderWithProviders } from "./helpers";

describe("ConfirmDialog", () => {
  it("requires the typed phrase before confirming", async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Delete venue"
        confirmLabel="Delete"
        tone="danger"
        requireText="joy-demo"
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Type joy-demo to confirm"), "joy-demo");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("desktop authorization", () => {
  const state = "s".repeat(16);
  const challenge = "c".repeat(43);

  beforeEach(() => {
    session.signIn(authFixture());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    session.expire();
  });

  it("validates the PKCE parameters", () => {
    expect(parseDesktopParams({ state, challenge })).toEqual({ state, challenge });
    expect(parseDesktopParams({ state: "short", challenge })).toBeNull();
    expect(parseDesktopParams({ state, challenge: "c".repeat(20) })).toBeNull();
    expect(parseDesktopParams({})).toBeNull();
  });

  it("explains an incomplete link instead of offering to authorize", async () => {
    await renderRoute(<DesktopAuthorizePage />, {
      path: "/desktop/authorize",
      url: "/desktop/authorize?state=x",
    });
    expect(screen.getByText("This link is incomplete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Authorize/ })).not.toBeInTheDocument();
  });

  it("posts the challenge and reports the handoff", async () => {
    const { mock, calls } = apiStub({
      "POST /v1/auth/desktop/authorize": ({ body }) =>
        jsonResponse({ code: "one-time-code", state: (body as { state: string }).state }),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<DesktopAuthorizePage />, {
      path: "/desktop/authorize",
      url: `/desktop/authorize?state=${state}&challenge=${challenge}`,
    });
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Authorize Joy Music Desktop" }));
    expect(await screen.findByText("Return to the app")).toBeInTheDocument();
    expect(calls[0]?.body).toEqual({ codeChallenge: challenge, state });
    expect(screen.getByRole("link", { name: "Open the app again" })).toHaveAttribute(
      "href",
      `joymusic://auth?code=one-time-code&state=${state}`,
    );
  });

  it("shows API failures without leaving the page", async () => {
    const { mock } = apiStub({
      "POST /v1/auth/desktop/authorize": () => errorResponse(400, "validation_failed"),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<DesktopAuthorizePage />, {
      path: "/desktop/authorize",
      url: `/desktop/authorize?state=${state}&challenge=${challenge}`,
    });
    await userEvent.click(screen.getByRole("button", { name: "Authorize Joy Music Desktop" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Some values are not accepted");
  });

  it("lets the user decline", async () => {
    await renderRoute(<DesktopAuthorizePage />, {
      path: "/desktop/authorize",
      url: `/desktop/authorize?state=${state}&challenge=${challenge}`,
    });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Access was not granted")).toBeInTheDocument();
  });
});

describe("DJ notice", () => {
  it("greets DJs and points to the desktop app", async () => {
    session.signIn({
      ...authFixture(),
      me: {
        ...meFixture,
        memberships: [{ organizationId: "org_1", organizationName: "Acme", role: "dj" }],
      },
    });
    await renderRoute(<DjNoticePage />, { path: "/dj" });
    expect(screen.getByRole("heading", { name: /use the desktop app/ })).toBeInTheDocument();
    session.expire();
  });
});
