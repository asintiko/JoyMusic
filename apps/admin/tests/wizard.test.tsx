import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "../src/lib/api";
import { VenueWizardPage } from "../src/pages/venues/venue-wizard-page";
import { apiStub, authFixture, errorResponse, jsonResponse, venueFixture } from "./helpers";
import { renderRoute } from "./router-helpers";

beforeEach(() => {
  session.signIn(authFixture());
});

afterEach(() => {
  vi.unstubAllGlobals();
  session.expire();
});

const publicVenue = { ...venueFixture, logoUrl: null };

describe("VenueWizardPage", () => {
  it("derives the slug from the name and checks availability", async () => {
    const { mock } = apiStub({
      "GET /v1/venues/nomad-lounge": () => errorResponse(404, "not_found"),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<VenueWizardPage />, { path: "/venues/new" });
    await userEvent.type(screen.getByLabelText(/Venue name/), "Nomad Lounge");
    expect((screen.getByLabelText(/Web address/) as HTMLInputElement).value).toBe("nomad-lounge");
    expect(await screen.findByText("Address is available")).toBeInTheDocument();
  });

  it("flags an address that is already taken", async () => {
    const { mock } = apiStub({
      "GET /v1/venues/joy-demo-club": () => jsonResponse(publicVenue),
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<VenueWizardPage />, { path: "/venues/new" });
    await userEvent.type(screen.getByLabelText(/Venue name/), "Joy Demo Club");
    expect(await screen.findByText("Address is already taken")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText("Choose the guest look")).not.toBeInTheDocument();
  });

  it("blocks invalid names and short slugs", async () => {
    const { mock } = apiStub({});
    vi.stubGlobal("fetch", mock);
    await renderRoute(<VenueWizardPage />, { path: "/venues/new" });
    await userEvent.type(screen.getByLabelText(/Venue name/), "A");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("At least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("At least 3 characters.")).toBeInTheDocument();
  });

  it("walks through the steps and recovers from a slug conflict on create", async () => {
    let attempts = 0;
    const { mock, calls } = apiStub({
      "GET /v1/venues/nomad-lounge": () => errorResponse(404, "not_found"),
      "POST /v1/admin/venues": () => {
        attempts += 1;
        return errorResponse(409, "conflict", "A venue with this slug already exists");
      },
    });
    vi.stubGlobal("fetch", mock);
    await renderRoute(<VenueWizardPage />, { path: "/venues/new" });
    await userEvent.type(screen.getByLabelText(/Venue name/), "Nomad Lounge");
    await screen.findByText("Address is available");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Choose the guest look")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("radio")[1] as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Ready to create")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create venue" }));
    await waitFor(() => expect(attempts).toBe(1));
    expect(
      await screen.findByText("This address is already taken by another venue."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use nomad-lounge-2 instead/ })).toBeInTheDocument();
    const body = calls.find((entry) => entry.key === "POST /v1/admin/venues")?.body;
    expect(body).toMatchObject({
      name: "Nomad Lounge",
      slug: "nomad-lounge",
      theme: "lounge",
      timezone: "Asia/Tashkent",
    });
  });
});
