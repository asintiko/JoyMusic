import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "../src/lib/api";
import { TeamPage } from "../src/pages/team/team-page";
import { apiStub, authFixture, errorResponse, jsonResponse, meFixture } from "./helpers";
import { renderRoute } from "./router-helpers";

const member = (
  id: string,
  role: "owner" | "admin" | "dj",
  email: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  userId: `usr_${id}`,
  email,
  name: email.split("@")[0],
  role,
  status: "active" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  ...extra,
});

function signInAs(role: "owner" | "admin") {
  session.signIn(authFixture({ accessToken: "a", refreshToken: "r" }));
  if (role === "admin") {
    session.signIn({
      ...authFixture(),
      me: {
        ...meFixture,
        memberships: [{ organizationId: "org_1", organizationName: "Acme", role: "admin" }],
      },
    });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  session.expire();
});

describe("TeamPage", () => {
  beforeEach(() => signInAs("owner"));

  it("creates an invite and shows a copyable link", async () => {
    const { mock, calls } = apiStub({
      "GET /v1/admin/members": () =>
        jsonResponse({
          members: [member("m1", "owner", "owner@example.com", { userId: "usr_1" })],
        }),
      "POST /v1/admin/members": ({ body }) =>
        jsonResponse(
          {
            member: member(
              "inv1",
              (body as { role: "dj" }).role,
              (body as { email: string }).email,
              { userId: null, status: "invited", name: null },
            ),
            inviteToken: "tok_secret",
          },
          201,
        ),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<TeamPage />, { path: "/djs" });
    await screen.findByText("owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "new-dj@example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invite" }));
    const link = (await within(dialog).findByLabelText("Invitation link")) as HTMLInputElement;
    expect(link.value).toBe(`${window.location.origin}/invite/tok_secret`);
    expect(calls.find((entry) => entry.key === "POST /v1/admin/members")?.body).toEqual({
      email: "new-dj@example.com",
      role: "dj",
    });
  });

  it("validates the invite email", async () => {
    const { mock, calls } = apiStub({
      "GET /v1/admin/members": () =>
        jsonResponse({
          members: [member("m1", "owner", "owner@example.com", { userId: "usr_1" })],
        }),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<TeamPage />, { path: "/djs" });
    await screen.findByText("owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Email"), "nope");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invite" }));
    expect(await within(dialog).findByText("Enter a valid email")).toBeInTheDocument();
    expect(calls.some((entry) => entry.key.startsWith("POST"))).toBe(false);
  });

  it("protects the last owner from demotion and removal", async () => {
    const { mock } = apiStub({
      "GET /v1/admin/members": () =>
        jsonResponse({
          members: [
            member("m1", "owner", "owner@example.com", { userId: "usr_1" }),
            member("m2", "dj", "dj@example.com"),
          ],
        }),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<TeamPage />, { path: "/djs" });
    await screen.findByText("dj@example.com");
    expect(screen.getByText(/There is one owner/)).toBeInTheDocument();
    const rows = screen.getAllByTestId("member-row");
    expect(within(rows[0] as HTMLElement).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByRole("combobox")).toBeInTheDocument();
  });

  it("shows a localized last-owner message when the server refuses a role change", async () => {
    const { mock } = apiStub({
      "GET /v1/admin/members": () =>
        jsonResponse({
          members: [
            member("m1", "owner", "owner@example.com", { userId: "usr_1" }),
            member("m3", "owner", "second@example.com"),
            member("m2", "dj", "dj@example.com"),
          ],
        }),
      "PATCH /v1/admin/members/m3": () =>
        errorResponse(409, "conflict", "Cannot demote the last owner of the organization"),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<TeamPage />, { path: "/djs" });
    await screen.findByText("second@example.com");
    const row = screen.getAllByTestId("member-row")[1] as HTMLElement;
    await userEvent.selectOptions(within(row).getByRole("combobox"), "admin");
    expect(
      await screen.findByText(
        "The organization must keep at least one owner. Promote someone else first.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect((within(row).getByRole("combobox") as HTMLSelectElement).value).toBe("owner"),
    );
  });
});

describe("TeamPage as admin", () => {
  beforeEach(() => signInAs("admin"));

  it("cannot change owners or grant ownership", async () => {
    const { mock } = apiStub({
      "GET /v1/admin/members": () =>
        jsonResponse({
          members: [
            member("m1", "owner", "owner@example.com"),
            member("m2", "dj", "dj@example.com"),
          ],
        }),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<TeamPage />, { path: "/djs" });
    await screen.findByText("dj@example.com");
    const rows = screen.getAllByTestId("member-row");
    expect(within(rows[0] as HTMLElement).queryByRole("combobox")).not.toBeInTheDocument();
    const options = within(within(rows[1] as HTMLElement).getByRole("combobox"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Admin", "DJ"]);
  });
});
