import { createApiClient } from "@joymusic/shared";
import type { AuthResult, RequestItem, Track, VenueState } from "@joymusic/shared";
import type { E2eEnvironment } from "./services";

let deviceCounter = 0;

export function createTestApi(environment: E2eEnvironment) {
  const anonymous = createApiClient({ baseUrl: environment.apiUrl });

  const asUser = (token: string) =>
    createApiClient({ baseUrl: environment.apiUrl, getToken: () => token });

  return {
    anonymous,
    asUser,
    async djLogin(): Promise<AuthResult> {
      return anonymous.call("authLogin", {
        body: { email: environment.djEmail, password: environment.djPassword },
      });
    },
    async ownerLogin(): Promise<AuthResult> {
      return anonymous.call("authLogin", {
        body: { email: "demo@joymusic.uz", password: environment.djPassword },
      });
    },
    async catalogTrack(artist: string, title: string): Promise<Track | null> {
      const normalize = (value: string) =>
        value
          .toLowerCase()
          .replace(/\([^)]*\)/gu, " ")
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
      try {
        const result = await anonymous.call("catalogSearch", {
          query: { q: `${artist} ${title}`, limit: 10 },
        });
        const wantedArtist = normalize(artist);
        const wantedTitle = normalize(title);
        return (
          result.tracks.find(
            (track) =>
              track.artworkUrl !== null &&
              normalize(track.title) === wantedTitle &&
              normalize(track.artist).includes(wantedArtist.split(" ")[0] ?? wantedArtist),
          ) ?? null
        );
      } catch {
        return null;
      }
    },
    async guestRequest(input: {
      artist: string;
      title: string;
      track?: Track | null;
      note?: string;
      dedicatedTo?: string;
      tableToken?: string;
    }): Promise<{ request: RequestItem; merged: boolean }> {
      deviceCounter += 1;
      const deviceId = `e2e-device-${Date.now()}-${deviceCounter}`;
      const joined = await anonymous.call("guestJoin", {
        params: { slug: environment.venueSlug },
        body: { deviceId, tableToken: input.tableToken },
      });
      const guest = createApiClient({
        baseUrl: environment.apiUrl,
        getToken: () => joined.guestToken,
      });
      return guest.call("requestCreate", {
        params: { slug: environment.venueSlug },
        body: {
          ...(input.track
            ? { track: input.track }
            : { freeText: { artist: input.artist, title: input.title } }),
          note: input.note,
          dedicatedTo: input.dedicatedTo,
          tableToken: input.tableToken,
        },
      });
    },
    async venueState(): Promise<VenueState> {
      return anonymous.call("venueState", { params: { slug: environment.venueSlug } });
    },
    async djState(token: string, sessionId: string): Promise<VenueState> {
      return asUser(token).call("djSessionState", { params: { sessionId } });
    },
    async endActiveSession(token: string): Promise<void> {
      const client = asUser(token);
      const { venues } = await client.call("djVenues");
      for (const venue of venues) {
        if (venue.activeSessionId) {
          await client.call("djSessionEnd", { params: { sessionId: venue.activeSessionId } });
        }
      }
    },
  };
}

export type TestApi = ReturnType<typeof createTestApi>;
