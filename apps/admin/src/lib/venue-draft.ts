import type { AdminVenue, VenueSettings, VenueTheme, VenueUpdateInput } from "@joymusic/shared";

export interface VenueDraft {
  name: string;
  city: string;
  address: string;
  timezone: string;
  theme: VenueTheme;
  logoUrl: string;
  coverUrl: string;
  maxRequestsPerDevice: string;
  windowMinutes: string;
  duplicateWindowMinutes: string;
  allowFreeText: boolean;
  allowNotes: boolean;
  showArtwork: boolean;
  defaultLocale: VenueSettings["defaultLocale"];
}

export function draftFromVenue(venue: AdminVenue): VenueDraft {
  return {
    name: venue.name,
    city: venue.city ?? "",
    address: venue.address ?? "",
    timezone: venue.timezone,
    theme: venue.theme,
    logoUrl: venue.logoUrl ?? "",
    coverUrl: venue.coverUrl ?? "",
    maxRequestsPerDevice: String(venue.settings.maxRequestsPerDevice),
    windowMinutes: String(venue.settings.windowMinutes),
    duplicateWindowMinutes: String(venue.settings.duplicateWindowMinutes),
    allowFreeText: venue.settings.allowFreeText,
    allowNotes: venue.settings.allowNotes,
    showArtwork: venue.settings.showArtwork,
    defaultLocale: venue.settings.defaultLocale,
  };
}

export type IntError = "required" | "integer" | "range" | null;

export function validateInt(value: string, min: number, max: number): IntError {
  if (value.trim() === "") return "required";
  if (!/^-?\d+$/.test(value.trim())) return "integer";
  const parsed = Number(value);
  return parsed < min || parsed > max ? "range" : null;
}

export const settingLimits = {
  maxRequestsPerDevice: [1, 50],
  windowMinutes: [1, 600],
  duplicateWindowMinutes: [0, 1440],
} as const;

export interface DraftErrors {
  name: "required" | "tooShort" | "tooLong" | null;
  maxRequestsPerDevice: IntError;
  windowMinutes: IntError;
  duplicateWindowMinutes: IntError;
}

export function validateDraft(draft: VenueDraft): DraftErrors {
  const nameLength = draft.name.trim().length;
  return {
    name:
      nameLength === 0
        ? "required"
        : nameLength < 2
          ? "tooShort"
          : nameLength > 120
            ? "tooLong"
            : null,
    maxRequestsPerDevice: validateInt(
      draft.maxRequestsPerDevice,
      ...settingLimits.maxRequestsPerDevice,
    ),
    windowMinutes: validateInt(draft.windowMinutes, ...settingLimits.windowMinutes),
    duplicateWindowMinutes: validateInt(
      draft.duplicateWindowMinutes,
      ...settingLimits.duplicateWindowMinutes,
    ),
  };
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.values(errors).some((value) => value !== null);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function diffDraft(venue: AdminVenue, draft: VenueDraft): VenueUpdateInput {
  const update: VenueUpdateInput = {};
  if (draft.name.trim() !== venue.name) update.name = draft.name.trim();
  if (nullable(draft.city) !== venue.city) update.city = nullable(draft.city);
  if (nullable(draft.address) !== venue.address) update.address = nullable(draft.address);
  if (draft.timezone !== venue.timezone) update.timezone = draft.timezone;
  if (draft.theme !== venue.theme) update.theme = draft.theme;
  if (nullable(draft.logoUrl) !== venue.logoUrl) update.logoUrl = nullable(draft.logoUrl);
  if (nullable(draft.coverUrl) !== venue.coverUrl) update.coverUrl = nullable(draft.coverUrl);
  const settings: Partial<VenueSettings> = {};
  const max = Number(draft.maxRequestsPerDevice);
  const window = Number(draft.windowMinutes);
  const duplicate = Number(draft.duplicateWindowMinutes);
  if (max !== venue.settings.maxRequestsPerDevice) settings.maxRequestsPerDevice = max;
  if (window !== venue.settings.windowMinutes) settings.windowMinutes = window;
  if (duplicate !== venue.settings.duplicateWindowMinutes)
    settings.duplicateWindowMinutes = duplicate;
  if (draft.allowFreeText !== venue.settings.allowFreeText)
    settings.allowFreeText = draft.allowFreeText;
  if (draft.allowNotes !== venue.settings.allowNotes) settings.allowNotes = draft.allowNotes;
  if (draft.showArtwork !== venue.settings.showArtwork) settings.showArtwork = draft.showArtwork;
  if (draft.defaultLocale !== venue.settings.defaultLocale)
    settings.defaultLocale = draft.defaultLocale;
  if (Object.keys(settings).length > 0) update.settings = settings;
  return update;
}

export function isDirty(venue: AdminVenue, draft: VenueDraft): boolean {
  return Object.keys(diffDraft(venue, draft)).length > 0;
}
