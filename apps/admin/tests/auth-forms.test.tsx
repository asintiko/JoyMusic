import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { session } from "../src/lib/api";
import { InvitePage } from "../src/pages/auth/invite-page";
import { LoginPage } from "../src/pages/auth/login-page";
import { RegisterPage } from "../src/pages/auth/register-page";
import { authFixture, errorResponse, jsonResponse } from "./helpers";
import { renderRoute } from "./router-helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  session.expire();
});

function stubFetch(handler: (url: string, init: RequestInit) => Response) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler(url, init ?? {});
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("LoginPage", () => {
  it("validates before calling the API", async () => {
    const fetchMock = stubFetch(() => jsonResponse({}));
    await renderRoute(<LoginPage />, { path: "/login" });
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findAllByText("Required field")).toHaveLength(2);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in and stores the session", async () => {
    stubFetch((url) =>
      url.endsWith("/v1/auth/login")
        ? jsonResponse(authFixture())
        : errorResponse(404, "not_found"),
    );
    const { router } = await renderRoute(<LoginPage />, { path: "/login" });
    await userEvent.type(screen.getByLabelText("Email"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(session.getSnapshot().status).toBe("authenticated"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("shows a friendly message for wrong credentials", async () => {
    stubFetch(() => errorResponse(401, "invalid_credentials"));
    await renderRoute(<LoginPage />, { path: "/login" });
    await userEvent.type(screen.getByLabelText("Email"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
    expect(session.getSnapshot().status).not.toBe("authenticated");
  });

  it("reports the lockout window from a rate limit", async () => {
    stubFetch(() => errorResponse(429, "rate_limited", "slow", { retryAfterSeconds: 30 }));
    await renderRoute(<LoginPage />, { path: "/login" });
    await userEvent.type(screen.getByLabelText("Email"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("30 seconds");
  });

  it("toggles password visibility", async () => {
    await renderRoute(<LoginPage />, { path: "/login" });
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
  });

  it("hides the Google button without a client id", async () => {
    await renderRoute(<LoginPage />, { path: "/login" });
    expect(screen.queryByTestId("google-button")).not.toBeInTheDocument();
  });

  it("renders in Russian", async () => {
    await renderRoute(<LoginPage />, { path: "/login", locale: "ru" });
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  });
});

describe("RegisterPage", () => {
  it("requires every field and a long password", async () => {
    const fetchMock = stubFetch(() => jsonResponse({}));
    await renderRoute(<RegisterPage />, { path: "/register" });
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("At least 8 characters", { selector: "p" })).toBeInTheDocument();
    expect(screen.getAllByText("Required field").length).toBeGreaterThanOrEqual(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates an organization with the interface locale", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/v1/auth/register")
        ? jsonResponse(authFixture())
        : errorResponse(404, "not_found"),
    );
    await renderRoute(<RegisterPage />, { path: "/register", locale: "uz" });
    await userEvent.type(screen.getByLabelText(/Tashkilot nomi/), "Nomad Group");
    await userEvent.type(screen.getByLabelText("Ismingiz"), "Aziza");
    await userEvent.type(screen.getByLabelText("Email"), "aziza@nomad.uz");
    await userEvent.type(screen.getByLabelText("Parol"), "long-enough-1");
    await userEvent.click(screen.getByRole("button", { name: "Akkaunt yaratish" }));
    await waitFor(() => expect(session.getSnapshot().status).toBe("authenticated"));
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      organizationName: "Nomad Group",
      name: "Aziza",
      locale: "uz",
      email: "aziza@nomad.uz",
    });
  });

  it("puts the taken-email error on the email field", async () => {
    stubFetch(() => errorResponse(409, "email_taken"));
    await renderRoute(<RegisterPage />, { path: "/register" });
    await userEvent.type(screen.getByLabelText(/Organization name/), "Nomad Group");
    await userEvent.type(screen.getByLabelText("Your name"), "Aziza");
    await userEvent.type(screen.getByLabelText("Email"), "taken@nomad.uz");
    await userEvent.type(screen.getByLabelText("Password"), "long-enough-1");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("This email is already registered.")).toBeInTheDocument();
  });
});

describe("InvitePage", () => {
  it("accepts an invitation by token", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/v1/auth/invites/accept")
        ? jsonResponse(authFixture())
        : errorResponse(404, "not_found"),
    );
    await renderRoute(<InvitePage />, { path: "/invite/$token", url: "/invite/tok_123" });
    await userEvent.type(screen.getByLabelText("Your name"), "Rustam");
    await userEvent.type(screen.getByLabelText("Password"), "long-enough-1");
    await userEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(session.getSnapshot().status).toBe("authenticated"));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      token: "tok_123",
      name: "Rustam",
      password: "long-enough-1",
    });
  });

  it("switches to a dead-end state for invalid invitations", async () => {
    stubFetch(() => errorResponse(400, "invite_invalid"));
    await renderRoute(<InvitePage />, { path: "/invite/$token", url: "/invite/expired" });
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Rustam" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(
      await screen.findByText("The invitation is invalid or has expired."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});
