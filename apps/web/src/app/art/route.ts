import { isAllowedArtworkHost } from "@/lib/art";

const maxBytes = 3 * 1024 * 1024;

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("u");
  if (!source) return new Response("Missing u", { status: 400 });
  let target: URL;
  try {
    target = new URL(source);
  } catch {
    return new Response("Invalid u", { status: 400 });
  }
  if (target.protocol !== "https:" || !isAllowedArtworkHost(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }
  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(6000),
      headers: { accept: "image/avif,image/webp,image/*" },
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("Upstream error", { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    if (body.byteLength > maxBytes) return new Response("Too large", { status: 413 });
    return new Response(body, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=604800, stale-while-revalidate=86400, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Upstream unavailable", { status: 504 });
  }
}
