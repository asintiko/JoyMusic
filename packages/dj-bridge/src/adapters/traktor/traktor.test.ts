import { connect } from "node:net";
import type { Socket } from "node:net";
import { request } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createRecordingSink } from "../../testing";
import { createTraktorAdapter } from "./adapter";
import {
  checkBasicAuth,
  createIcyStreamParser,
  findHeadEnd,
  parseAdminMetadata,
  parseIcecastRequestHead,
  parseIcyMetadataBlock,
  parseSongMetadata,
} from "./icecast";
import { createIcecastReceiver } from "./receiver";
import type { IcecastReceiver } from "./receiver";

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("icecast parsing", () => {
  it("parses a SOURCE request head", () => {
    const head = parseIcecastRequestHead(
      "SOURCE /live HTTP/1.0\r\nAuthorization: Basic abc\r\nContent-Type: audio/mpeg\r\nice-name: Joy\r\n\r\n",
    );
    expect(head).toMatchObject({ method: "SOURCE", path: "/live", version: "HTTP/1.0" });
    expect(head?.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("rejects malformed request lines", () => {
    expect(parseIcecastRequestHead("hello\r\n\r\n")).toBeNull();
    expect(parseIcecastRequestHead("\u0000\u0001\u0002")).toBeNull();
    expect(parseIcecastRequestHead("get /x HTTP/1.1\r\n\r\n")).toBeNull();
  });

  it("parses admin metadata with plus and percent encoding", () => {
    const head = parseIcecastRequestHead(
      "GET /admin/metadata?mode=updinfo&mount=/live&song=Daft+Punk+-+Around%20The%20World&charset=UTF-8 HTTP/1.0\r\n\r\n",
    );
    expect(head && parseAdminMetadata(head)).toEqual({
      mount: "/live",
      song: { artist: "Daft Punk", title: "Around The World" },
    });
  });

  it("supports artist and title parameters and rejects other modes", () => {
    const named = parseIcecastRequestHead(
      "GET /admin/metadata?mode=updinfo&mount=/a&artist=X&title=Y HTTP/1.1\r\n\r\n",
    );
    expect(named && parseAdminMetadata(named)?.song).toEqual({ artist: "X", title: "Y" });
    const other = parseIcecastRequestHead("GET /admin/metadata?mode=other HTTP/1.1\r\n\r\n");
    expect(other && parseAdminMetadata(other)).toBeNull();
  });

  it("finds the end of the head and checks basic auth", () => {
    expect(findHeadEnd(Buffer.from("A\r\n\r\nrest"))).toBe(5);
    expect(findHeadEnd(Buffer.from("A\r\nB"))).toBe(-1);
    expect(checkBasicAuth(basic("source", "pw"), { user: "source", password: "pw" })).toBe(true);
    expect(checkBasicAuth(basic("source", "no"), { user: "source", password: "pw" })).toBe(false);
    expect(checkBasicAuth("Basic %%%", { user: "source", password: "pw" })).toBe(false);
    expect(checkBasicAuth(undefined, { user: "source", password: "pw" })).toBe(false);
    expect(checkBasicAuth(undefined, null)).toBe(true);
  });

  it("parses song text and ICY blocks", () => {
    expect(parseSongMetadata("Artist - Title")).toEqual({ artist: "Artist", title: "Title" });
    expect(parseSongMetadata("   ")).toBeNull();
    expect(parseIcyMetadataBlock(Buffer.from("StreamTitle='It's - Fine';StreamUrl='';\0\0"))).toBe(
      "It's - Fine",
    );
    expect(parseIcyMetadataBlock(Buffer.from("nothing"))).toBeNull();
  });

  it("extracts in-stream metadata across chunk boundaries", () => {
    const titles: string[] = [];
    const parser = createIcyStreamParser(8, (title) => titles.push(title));
    const text = "StreamTitle='A - B';";
    const block = Buffer.alloc(Math.ceil(text.length / 16) * 16);
    block.write(text);
    const stream = Buffer.concat([
      Buffer.alloc(8, 1),
      Buffer.from([block.length / 16]),
      block,
      Buffer.alloc(8, 2),
      Buffer.from([0]),
      Buffer.alloc(8, 3),
    ]);
    for (let index = 0; index < stream.length; index += 5) {
      parser.push(stream.subarray(index, index + 5));
    }
    expect(titles).toEqual(["A - B"]);
  });
});

const receivers: IcecastReceiver[] = [];
const sockets: Socket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  for (const receiver of receivers.splice(0)) await receiver.stop();
});

async function startReceiver(options: Parameters<typeof createIcecastReceiver>[0] = {}) {
  const receiver = createIcecastReceiver({ port: 0, ...options });
  receivers.push(receiver);
  const port = await receiver.start();
  return { receiver, port };
}

function rawExchange(port: number, payload: string | Buffer, until: RegExp | null = /\r\n\r\n/u) {
  return new Promise<string>((resolve, reject) => {
    const socket = connect(port, "127.0.0.1");
    sockets.push(socket);
    let received = "";
    socket.on("data", (chunk) => {
      received += chunk.toString("latin1");
      if (until && until.test(received)) resolve(received);
    });
    socket.on("close", () => resolve(received));
    socket.on("error", reject);
    socket.on("connect", () => socket.write(payload));
  });
}

function httpGet(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, method: "GET", headers }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => (body += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

const until = async (predicate: () => boolean) => {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition not met");
};

describe("icecast receiver (real sockets)", () => {
  it("accepts SOURCE, discards audio and applies admin metadata from a real HTTP client", async () => {
    const updates: string[] = [];
    const sourceEvents: string[] = [];
    const { port } = await startReceiver({
      password: "pw",
      onMetadata: ({ mount, song }) => updates.push(`${mount}|${song?.artist}|${song?.title}`),
      onSource: ({ mount, connected }) => sourceEvents.push(`${mount}:${connected}`),
    });

    const source = connect(port, "127.0.0.1");
    sockets.push(source);
    const reply = await new Promise<string>((resolve) => {
      source.once("data", (chunk) => resolve(chunk.toString()));
      source.write(
        `SOURCE /live HTTP/1.0\r\nAuthorization: ${basic("source", "pw")}\r\nContent-Type: audio/mpeg\r\n\r\n`,
      );
    });
    expect(reply.startsWith("HTTP/1.0 200 OK")).toBe(true);
    source.write(Buffer.alloc(64 * 1024, 7));

    const metadata = await httpGet(
      port,
      "/admin/metadata?mode=updinfo&mount=%2Flive&song=Shahzoda+-+Sevaman",
      { Authorization: basic("admin", "pw") },
    );
    expect(metadata.status).toBe(200);
    expect(metadata.body).toContain("<return>1</return>");
    expect(updates).toEqual(["/live|Shahzoda|Sevaman"]);
    expect(sourceEvents).toEqual(["/live:true"]);

    source.destroy();
    await until(() => sourceEvents.length === 2);
    expect(sourceEvents[1]).toBe("/live:false");
  });

  it("supports PUT sources with Expect: 100-continue and in-stream ICY metadata", async () => {
    const updates: string[] = [];
    const { port } = await startReceiver({
      onMetadata: ({ song }) => updates.push(`${song?.artist}|${song?.title}`),
    });
    const text = "StreamTitle='Мот - Ты моя';";
    const block = Buffer.alloc(Math.ceil(Buffer.byteLength(text) / 16) * 16);
    block.write(text);
    const reply = await rawExchange(
      port,
      Buffer.concat([
        Buffer.from("PUT /live HTTP/1.1\r\nExpect: 100-continue\r\nicy-metaint: 4\r\n\r\n"),
        Buffer.alloc(4),
        Buffer.from([block.length / 16]),
        block,
      ]),
    );
    expect(reply.startsWith("HTTP/1.1 100 Continue")).toBe(true);
    await until(() => updates.length === 1);
    expect(updates[0]).toBe("Мот|Ты моя");
  });

  it("rejects bad credentials with 401", async () => {
    const { port } = await startReceiver({ password: "pw" });
    const reply = await rawExchange(
      port,
      "SOURCE /live HTTP/1.0\r\nAuthorization: Basic Zm9vOmJhcg==\r\n\r\n",
    );
    expect(reply.startsWith("HTTP/1.0 401")).toBe(true);
    const admin = await httpGet(port, "/admin/metadata?mode=updinfo&song=A+-+B");
    expect(admin.status).toBe(401);
  });

  it("is robust to malformed and oversized input", async () => {
    const updates: unknown[] = [];
    const { receiver, port } = await startReceiver({
      headerTimeoutMs: 200,
      onMetadata: (update) => updates.push(update),
    });
    expect((await rawExchange(port, "garbage garbage\r\n\r\n")).startsWith("HTTP/1.0 400")).toBe(
      true,
    );
    expect(
      (await rawExchange(port, Buffer.alloc(40_000, 65), null)).startsWith("HTTP/1.0 431"),
    ).toBe(true);
    expect(
      (await rawExchange(port, Buffer.from([0, 255, 254, 13, 10, 13, 10]))).startsWith(
        "HTTP/1.0 400",
      ),
    ).toBe(true);
    expect(
      (await rawExchange(port, "GET /nothing HTTP/1.0\r\n\r\n")).startsWith("HTTP/1.0 404"),
    ).toBe(true);
    const half = await rawExchange(port, "SOURCE /live HTTP/1.0\r\nHost: x", null);
    expect(half).toBe("");
    const bad = await httpGet(port, "/admin/metadata?mode=nope");
    expect(bad.status).toBe(400);
    expect(updates).toEqual([]);
    expect(receiver.sourceCount()).toBe(0);
  });

  it("limits concurrent sources", async () => {
    const { port } = await startReceiver({ maxSources: 1 });
    const first = connect(port, "127.0.0.1");
    sockets.push(first);
    await new Promise<void>((resolve) => {
      first.once("data", () => resolve());
      first.write("SOURCE /a HTTP/1.0\r\n\r\n");
    });
    const reply = await rawExchange(port, "SOURCE /b HTTP/1.0\r\n\r\n");
    expect(reply.startsWith("HTTP/1.0 403")).toBe(true);
  });
});

describe("createTraktorAdapter", () => {
  it("publishes tracks from Icecast metadata and clears when Traktor disconnects", async () => {
    const adapter = createTraktorAdapter({ port: 0 });
    const sink = createRecordingSink();
    await adapter.start(sink);
    expect(adapter.status().state).toBe("waiting");
    const port = Number(/:(\d+)$/u.exec(adapter.status().detail ?? "")?.[1]);
    expect(port).toBeGreaterThan(0);

    const source = connect(port, "127.0.0.1");
    sockets.push(source);
    await new Promise<void>((resolve) => {
      source.once("data", () => resolve());
      source.write("SOURCE /traktor HTTP/1.0\r\n\r\n");
    });
    expect(adapter.status().state).toBe("active");
    await httpGet(port, "/admin/metadata?mode=updinfo&mount=/traktor&song=Artist+-+Title");
    expect(sink.calls).toContain("track:Title");

    source.destroy();
    await until(() => sink.calls.includes("track:-"));
    expect(adapter.status().state).toBe("waiting");
    await adapter.stop();
    expect(adapter.status().state).toBe("stopped");
  });

  it("reports an error when the port is already taken", async () => {
    const { port } = await startReceiver();
    const adapter = createTraktorAdapter({ port });
    await adapter.start(createRecordingSink());
    expect(adapter.status().state).toBe("error");
    await adapter.stop();
  });
});
