const api = process.env.API_URL ?? "http://localhost:4400";
const slug = process.env.VENUE_SLUG ?? "joy-demo-club";
const password = process.env.SEED_PASSWORD ?? "joymusic-demo";

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${text}`);
  return json;
}

const login = await call("POST", "/v1/auth/login", {
  body: { email: "dj@joymusic.uz", password },
});
const token = login.accessToken;
const venue = await call("GET", `/v1/venues/${slug}`);

let sessionId = venue.activeSessionId ?? null;
if (!sessionId) {
  const state = await call("GET", `/v1/venues/${slug}/state`);
  sessionId = state.session?.id ?? null;
}
if (!sessionId) {
  const session = await call("POST", `/v1/dj/venues/${venue.id}/sessions`, { token });
  sessionId = session.id;
}

const wanted = (
  process.env.TRACKS ??
  "Shahzoda Yomgir|Ozodbek Nazarbekov|The Weeknd Blinding Lights|Dua Lipa Levitating|Daft Punk One More Time|Ruslan Sharipov Kelinchik"
).split("|");
const requests = [];
for (const query of wanted) {
  const found = await call("GET", `/v1/catalog/search?q=${encodeURIComponent(query)}&limit=3`);
  const track = found.tracks[0];
  if (!track) continue;
  const request = await call("POST", `/v1/dj/sessions/${sessionId}/requests`, {
    token,
    body: { track, dedicatedTo: requests.length === 1 ? "Aziz" : undefined },
  });
  requests.push(request);
}

if (process.env.PLAY !== "0" && requests[0]) {
  await call("POST", `/v1/dj/requests/${requests[0].id}/play`, { token });
  await call("PUT", `/v1/dj/sessions/${sessionId}/nowplaying`, {
    token,
    body: {
      title: requests[0].title,
      artist: requests[0].artist,
      artworkUrl: requests[0].artworkUrl,
      durationSec: requests[0].track?.durationSec ?? 200,
      bpm: 118,
      key: "8A",
      source: "request",
      requestId: requests[0].id,
    },
  });
}

process.stdout.write(`${JSON.stringify({ sessionId, queued: requests.length })}\n`);
