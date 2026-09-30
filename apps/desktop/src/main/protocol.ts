import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { appHost } from "./security";

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
};

export function resolveAppFile(root: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.host !== appHost) return null;
  const pathname = decodeURIComponent(url.pathname);
  const relative =
    pathname === "/" || pathname === "" ? "index.html" : pathname.replace(/^\/+/u, "");
  const target = normalize(join(root, relative));
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}

export async function serveAppFile(
  root: string,
  requestUrl: string,
  headers: Record<string, string>,
): Promise<Response> {
  const target = resolveAppFile(root, requestUrl);
  if (!target) return new Response("Forbidden", { status: 403 });
  try {
    const body = await readFile(target);
    const type = mimeTypes[extname(target).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { "content-type": type, ...headers },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
