import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://joymusic:joymusic@127.0.0.1:54329/joymusic_admin";

function psql(sql, { tuples = false } = {}) {
  const args = [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"];
  if (tuples) args.push("-At");
  args.push("-c", sql);
  const result = spawnSync("psql", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || "psql failed");
  return result.stdout.trim();
}

function id(prefix) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

let seed = 20260930;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function pick(list) {
  return list[Math.floor(random() * list.length)];
}

function weighted(weights) {
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return index;
  }
  return weights.length - 1;
}

const tracks = [
  ["Ozod & Nilufar", "Oydin kecha"],
  ["The Weeknd", "Blinding Lights"],
  ["Laylo", "Kechqurun"],
  ["Dua Lipa", "Levitating"],
  ["Shahzoda", "Sevgi qoʻshigʻi"],
  ["Jah Khalib", "Лейла"],
  ["Rayhon", "Yor-yor"],
  ["Miyagi & Andy Panda", "Minor"],
  ["Ulugbek Rahmatullaev", "Yomgʻir"],
  ["Doja Cat", "Say So"],
  ["Sardor Rahimxon", "Ketma"],
  ["Artik & Asti", "Грустный дэнс"],
  ["Calvin Harris", "Summer"],
  ["Ziyoda", "Sevaman"],
  ["Tiesto", "The Business"],
  ["Xcho", "Тает лёд"],
];
const trackWeights = [26, 24, 20, 18, 16, 14, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2];

const hourWeights = [
  34, 22, 12, 4, 1, 1, 1, 1, 1, 2, 3, 4, 6, 8, 9, 10, 12, 16, 22, 30, 42, 58, 70, 62,
];
const notes = [
  null,
  null,
  null,
  null,
  "Aziz uchun, tugʻilgan kun bilan!",
  "Для Азиза, с днём рождения!",
  "Pls play next",
];

const organization = psql("select id from organizations order by created_at limit 1", {
  tuples: true,
});
const owner = psql("select id from users where email = 'demo@joymusic.uz'", { tuples: true });
const dj = psql("select id from users where email = 'dj@joymusic.uz'", { tuples: true });
if (!organization || !owner || !dj) throw new Error("Run db:seed first");

const settings = JSON.stringify({
  requestsOpen: true,
  maxRequestsPerDevice: 3,
  windowMinutes: 30,
  duplicateWindowMinutes: 60,
  allowFreeText: true,
  allowNotes: true,
  showArtwork: true,
  defaultLocale: "uz",
});

const extraVenues = [
  { slug: "nomad-lounge", name: "Nomad Lounge", city: "Toshkent", theme: "lounge", scale: 0.9 },
  { slug: "oasis-cafe", name: "Oasis Café", city: "Namangan", theme: "cafe", scale: 0.35 },
  { slug: "neon-garden", name: "Neon Garden", city: "Samarqand", theme: "club", scale: 0.7 },
];

for (const venue of extraVenues) {
  const existing = psql(
    `select id from venues where slug = ${quote(venue.slug)} and deleted_at is null`,
    { tuples: true },
  );
  if (existing) continue;
  const venueId = id("ven");
  psql(
    `insert into venues (id, organization_id, slug, name, city, theme, timezone, settings) values (${quote(venueId)}, ${quote(organization)}, ${quote(venue.slug)}, ${quote(venue.name)}, ${quote(venue.city)}, ${quote(venue.theme)}, 'Asia/Tashkent', ${quote(settings)}::jsonb)`,
  );
  const labels = ["Bar", ...Array.from({ length: 8 }, (_unused, index) => `Table ${index + 1}`)];
  const rows = labels.map(
    (label) =>
      `(${quote(id("qr"))}, ${quote(venueId)}, ${quote(label)}, ${quote(randomBytes(9).toString("base64url"))}, true, ${Math.floor(random() * 300)})`,
  );
  psql(`insert into qr_codes (id, venue_id, label, token, active, scans) values ${rows.join(",")}`);
}

const venues = psql(
  "select id, slug, name from venues where deleted_at is null order by created_at",
  { tuples: true },
)
  .split("\n")
  .map((line) => {
    const [venueId, slug, name] = line.split("|");
    return { id: venueId, slug, name };
  });

psql("update qr_codes set scans = 20 + floor(random() * 380)::int where scans = 0");

const scales = {
  "joy-demo-club": 1,
  ...Object.fromEntries(extraVenues.map((venue) => [venue.slug, venue.scale])),
};
const now = Date.now();
const dayMs = 86_400_000;
const sessionRows = [];
const requestRows = [];
const playRows = [];
const deviceRows = new Map();

for (const venue of venues) {
  const already = Number(
    psql(`select count(*) from dj_sessions where venue_id = ${quote(venue.id)}`, { tuples: true }),
  );
  if (already > 0) continue;
  const scale = scales[venue.slug] ?? 0.5;
  const tables = psql(`select label from qr_codes where venue_id = ${quote(venue.id)}`, {
    tuples: true,
  }).split("\n");
  for (let offset = 29; offset >= 0; offset -= 1) {
    const weekday = new Date(now - offset * dayMs).getUTCDay();
    const busy = weekday === 5 || weekday === 6 ? 1.6 : weekday === 0 ? 0.9 : 0.5;
    if (random() > 0.55 + busy * 0.25) continue;
    const dayStart = new Date(now - offset * dayMs);
    dayStart.setUTCHours(15, 0, 0, 0);
    const startedAt =
      offset === 0
        ? new Date(now - 3 * 3_600_000)
        : new Date(dayStart.getTime() + Math.floor(random() * 3) * 3_600_000);
    const durationHours = 4 + Math.floor(random() * 4);
    const endedAt = new Date(startedAt.getTime() + durationHours * 3_600_000);
    const live = offset === 0 && venue.slug !== "oasis-cafe";
    const sessionId = id("ses");
    sessionRows.push(
      `(${quote(sessionId)}, ${quote(venue.id)}, ${quote(dj)}, ${quote(startedAt.toISOString())}, ${live ? "NULL" : quote(endedAt.toISOString())})`,
    );
    const count = Math.round((30 + random() * 70) * busy * scale);
    for (let index = 0; index < count; index += 1) {
      const hourIndex = weighted(hourWeights);
      const local = new Date(startedAt.getTime());
      local.setUTCHours(
        (hourIndex + 19) % 24,
        Math.floor(random() * 60),
        Math.floor(random() * 60),
        0,
      );
      let created = local.getTime();
      if (created < startedAt.getTime()) created += dayMs;
      if (created > endedAt.getTime())
        created =
          startedAt.getTime() + Math.floor(random() * (endedAt.getTime() - startedAt.getTime()));
      if (created > now) created = now - 60_000;
      const [artist, title] = tracks[weighted(trackWeights)];
      const roll = random();
      const status =
        roll < 0.66 ? "played" : roll < 0.8 ? "declined" : roll < 0.9 ? "expired" : "played";
      const deviceId = `d-${venue.slug.slice(0, 2)}${Math.floor(random() * (260 * scale + 40)) + 1000}`;
      deviceRows.set(`${venue.id}|${deviceId}`, created);
      const requestId = id("req");
      if (status === "played") {
        playRows.push(
          `(${quote(id("ply"))}, ${quote(sessionId)}, ${quote(venue.id)}, ${quote(title)}, ${quote(artist)}, ${quote(new Date(created + 600_000).toISOString())}, ${quote(requestId)})`,
        );
      }
      requestRows.push(
        `(${quote(requestId)}, ${quote(sessionId)}, ${quote(venue.id)}, ${quote(title)}, ${quote(artist)}, ${quote(pick(notes))}, ${quote(pick(tables))}, ${quote(deviceId)}, ${1 + Math.floor(random() * 4)}, ${quote(status)}, ${status === "declined" ? quote("Not for tonight") : "NULL"}, ${quote(new Date(created).toISOString())}, ${quote(new Date(created).toISOString())})`,
      );
    }
  }
}

if (sessionRows.length > 0) {
  psql(
    `insert into dj_sessions (id, venue_id, dj_user_id, started_at, ended_at) values ${sessionRows.join(",")}`,
  );
}
const chunk = 400;
for (let start = 0; start < requestRows.length; start += chunk) {
  psql(
    `insert into requests (id, session_id, venue_id, title, artist, note, table_label, device_id, votes, status, decline_reason, created_at, updated_at) values ${requestRows.slice(start, start + chunk).join(",")}`,
  );
}
for (let start = 0; start < playRows.length; start += chunk) {
  psql(
    `insert into play_log (id, session_id, venue_id, title, artist, started_at, request_id) values ${playRows.slice(start, start + chunk).join(",")}`,
  );
}
const deviceInserts = [...deviceRows.entries()].map(([key, created]) => {
  const [venueId, deviceId] = key.split("|");
  return `(${quote(deviceId)}, ${quote(venueId)}, ${quote(new Date(created).toISOString())}, ${quote(new Date(created).toISOString())})`;
});
for (let start = 0; start < deviceInserts.length; start += chunk) {
  psql(
    `insert into guest_devices (id, venue_id, first_seen_at, last_seen_at) values ${deviceInserts.slice(start, start + chunk).join(",")} on conflict do nothing`,
  );
}

const invited = psql("select count(*) from invites where email = 'aziza@nomad.uz'", {
  tuples: true,
});
if (invited === "0") {
  psql(
    `insert into invites (id, organization_id, email, role, token_hash, expires_at, invited_by) values (${quote(id("inv"))}, ${quote(organization)}, 'aziza@nomad.uz', 'admin', ${quote(randomBytes(16).toString("hex"))}, now() + interval '5 days', ${quote(owner)})`,
  );
}

const auditCount = Number(
  psql(`select count(*) from audit_log where organization_id = ${quote(organization)}`, {
    tuples: true,
  }),
);
if (auditCount === 0) {
  const entries = [
    ["venue.create", "ven-x", { slug: "nomad-lounge", name: "Nomad Lounge" }, 28],
    ["venue.create", "ven-x", { slug: "oasis-cafe", name: "Oasis Café" }, 27],
    ["qr.create", "qr-x", { label: "Table 1" }, 26],
    ["qr.create", "qr-x", { label: "Table 2" }, 26],
    ["venue.update", "ven-x", { fields: ["theme", "settings"] }, 20],
    ["banned_word.add", "bw-x", { word: "jalab" }, 14],
    ["member.invite", "inv-x", { email: "aziza@nomad.uz", role: "admin" }, 9],
    [
      "member.role_update",
      "mem-x",
      { email: "dj@joymusic.uz", from: "admin", to: "dj", status: "membership" },
      6,
    ],
    ["qr.update", "qr-x", { label: "Table 8", active: false }, 3],
    ["banned_word.add", "bw-x", { word: "qahba" }, 2],
    ["device.ban", "d-jo1042", { venueId: "ven-x" }, 1],
    ["qr.delete", "qr-x", { label: "Table 11" }, 0],
  ];
  const rows = entries.map(
    ([action, target, meta, daysAgo], index) =>
      `(${quote(id("aud"))}, ${quote(organization)}, ${quote(owner)}, ${quote(action)}, ${quote(target)}, ${quote(JSON.stringify(meta))}::jsonb, ${quote(new Date(now - daysAgo * dayMs - index * 1_800_000).toISOString())})`,
  );
  psql(
    `insert into audit_log (id, organization_id, actor_user_id, action, target, meta, created_at) values ${rows.join(",")}`,
  );
}

process.stdout.write(
  `sessions ${sessionRows.length}, requests ${requestRows.length}, devices ${deviceRows.size}\n`,
);
