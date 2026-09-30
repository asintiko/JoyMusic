import type { AdminVenue } from "@joymusic/shared";
import { describe, expect, it } from "vitest";
import {
  diffDraft,
  draftFromVenue,
  hasErrors,
  isDirty,
  validateDraft,
  validateInt,
} from "../src/lib/venue-draft";

const venue: AdminVenue = {
  id: "ven_1",
  organizationId: "org_1",
  slug: "joy-demo-club",
  name: "Joy Demo Club",
  city: "Tashkent",
  address: null,
  theme: "club",
  logoUrl: null,
  coverUrl: null,
  timezone: "Asia/Tashkent",
  createdAt: "2026-09-01T00:00:00.000Z",
  activeSessionId: null,
  settings: {
    requestsOpen: true,
    maxRequestsPerDevice: 3,
    windowMinutes: 30,
    duplicateWindowMinutes: 60,
    allowFreeText: true,
    allowNotes: true,
    showArtwork: true,
    defaultLocale: "uz",
  },
};

describe("venue draft", () => {
  it("is clean right after loading", () => {
    const draft = draftFromVenue(venue);
    expect(isDirty(venue, draft)).toBe(false);
    expect(diffDraft(venue, draft)).toEqual({});
  });

  it("sends only changed fields", () => {
    const draft = {
      ...draftFromVenue(venue),
      name: "New name",
      theme: "lounge" as const,
      windowMinutes: "45",
      allowNotes: false,
    };
    expect(diffDraft(venue, draft)).toEqual({
      name: "New name",
      theme: "lounge",
      settings: { windowMinutes: 45, allowNotes: false },
    });
  });

  it("turns cleared text into null", () => {
    const draft = { ...draftFromVenue(venue), city: "  " };
    expect(diffDraft(venue, draft)).toEqual({ city: null });
  });

  it("validates numeric limits", () => {
    expect(validateInt("", 1, 50)).toBe("required");
    expect(validateInt("2.5", 1, 50)).toBe("integer");
    expect(validateInt("0", 1, 50)).toBe("range");
    expect(validateInt("51", 1, 50)).toBe("range");
    expect(validateInt("50", 1, 50)).toBeNull();
    expect(validateInt("0", 0, 1440)).toBeNull();
  });

  it("flags invalid drafts", () => {
    const errors = validateDraft({
      ...draftFromVenue(venue),
      name: "A",
      maxRequestsPerDevice: "99",
    });
    expect(errors.name).toBe("tooShort");
    expect(errors.maxRequestsPerDevice).toBe("range");
    expect(hasErrors(errors)).toBe(true);
    expect(hasErrors(validateDraft(draftFromVenue(venue)))).toBe(false);
  });
});
