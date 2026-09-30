const VERSION = "jm-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline.html";
const NAVIGATION_TIMEOUT_MS = 4000;
const STATIC_LIMIT = 160;
const PAGE_LIMIT = 8;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname === "/art" ||
    /\.(?:woff2?|webp|avif|png|jpg|svg|ico|css|js)$/.test(url.pathname)
  );
}

function isNeverCached(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/v1/") ||
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/tv/") ||
    url.pathname.endsWith(".webmanifest")
  );
}

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const overflow = keys.length - limit;
  for (let index = 0; index < overflow; index += 1) await cache.delete(keys[index]);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).then(() => trim(STATIC_CACHE, STATIC_LIMIT));
      }
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

function timeout(milliseconds) {
  return new Promise((_resolve, reject) =>
    setTimeout(() => reject(new Error("timeout")), milliseconds),
  );
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(NAVIGATION_TIMEOUT_MS)]);
    if (response.ok && new URL(request.url).pathname.startsWith("/v/")) {
      cache.put(request, response.clone()).then(() => trim(PAGE_CACHE, PAGE_LIMIT));
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNeverCached(url)) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(staleWhileRevalidate(request));
});
