import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export interface RecordedRequest {
  url: string;
}

export function createFetchStub(handler: (url: URL) => Response | Promise<Response>): {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetch: async (input) => {
      requests.push({ url: input });
      return handler(new URL(input));
    },
  };
}
