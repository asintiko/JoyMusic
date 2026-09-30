import { createServer } from "node:net";
import type { AddressInfo, Server, Socket } from "node:net";
import {
  checkBasicAuth,
  createIcyStreamParser,
  findHeadEnd,
  maxHeadBytes,
  parseAdminMetadata,
  parseIcecastRequestHead,
  parseSongMetadata,
} from "./icecast";
import type { IcecastRequestHead, SongMetadata } from "./icecast";

export interface IcecastReceiverOptions {
  host?: string;
  port?: number;
  password?: string | null;
  maxSources?: number;
  headerTimeoutMs?: number;
  streamIdleTimeoutMs?: number;
  onMetadata?(update: { mount: string; song: SongMetadata | null }): void;
  onSource?(event: { mount: string; connected: boolean }): void;
}

export interface IcecastReceiver {
  start(): Promise<number>;
  stop(): Promise<void>;
  port(): number | null;
  sourceCount(): number;
}

const authUsers = ["source", "admin"];

function respond(socket: Socket, status: string, headers: string[], body = ""): void {
  const lines = [
    `HTTP/1.0 ${status}`,
    ...headers,
    `Content-Length: ${Buffer.byteLength(body)}`,
    "Connection: close",
    "",
    body,
  ];
  socket.end(lines.join("\r\n"));
}

function authorized(head: IcecastRequestHead, password: string | null | undefined): boolean {
  if (password === null || password === undefined) return true;
  const header = head.headers.get("authorization");
  return authUsers.some((user) => checkBasicAuth(header, { user, password }));
}

export function createIcecastReceiver(options: IcecastReceiverOptions = {}): IcecastReceiver {
  const host = options.host ?? "127.0.0.1";
  const maxSources = options.maxSources ?? 4;
  const headerTimeoutMs = options.headerTimeoutMs ?? 5000;
  const streamIdleTimeoutMs = options.streamIdleTimeoutMs ?? 60_000;
  const sockets = new Set<Socket>();
  let server: Server | null = null;
  let sources = 0;

  const unauthorizedResponse = (socket: Socket) =>
    respond(socket, "401 Unauthorized", ['WWW-Authenticate: Basic realm="Icecast Server"']);

  const handleAdmin = (socket: Socket, head: IcecastRequestHead) => {
    if (!authorized(head, options.password)) {
      unauthorizedResponse(socket);
      return;
    }
    const parsed = parseAdminMetadata(head);
    if (parsed === null) {
      respond(socket, "400 Bad Request", [], "Bad request");
      return;
    }
    options.onMetadata?.(parsed);
    respond(
      socket,
      "200 OK",
      ["Content-Type: text/xml"],
      '<?xml version="1.0"?><iceresponse><message>Metadata update successful</message><return>1</return></iceresponse>',
    );
  };

  const handleSource = (socket: Socket, head: IcecastRequestHead, rest: Uint8Array) => {
    if (!authorized(head, options.password)) {
      unauthorizedResponse(socket);
      return;
    }
    if (sources >= maxSources) {
      respond(socket, "403 Forbidden", [], "Too many sources");
      return;
    }
    sources += 1;
    const mount = head.path;
    options.onSource?.({ mount, connected: true });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      sources -= 1;
      options.onSource?.({ mount, connected: false });
    };
    socket.once("close", close);
    if (head.method === "PUT") {
      if ((head.headers.get("expect") ?? "").toLowerCase() === "100-continue") {
        socket.write("HTTP/1.1 100 Continue\r\n\r\n");
      }
    } else {
      socket.write("HTTP/1.0 200 OK\r\n\r\n");
    }
    socket.setTimeout(streamIdleTimeoutMs, () => socket.destroy());
    const metaint = Number.parseInt(head.headers.get("icy-metaint") ?? "", 10);
    const icy =
      Number.isFinite(metaint) && metaint > 0 && metaint <= 65_536
        ? createIcyStreamParser(metaint, (title) => {
            options.onMetadata?.({ mount, song: parseSongMetadata(title) });
          })
        : null;
    if (icy && rest.length > 0) icy.push(rest);
    if (icy) socket.on("data", (chunk: Buffer) => icy.push(chunk));
    else socket.on("data", () => undefined);
  };

  const handleConnection = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => socket.destroy());
    socket.setTimeout(headerTimeoutMs, () => socket.destroy());
    let buffered: Buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk]);
      const end = findHeadEnd(buffered);
      if (end < 0) {
        if (buffered.length > maxHeadBytes) {
          socket.removeListener("data", onData);
          respond(socket, "431 Request Header Fields Too Large", []);
        }
        return;
      }
      socket.removeListener("data", onData);
      socket.setTimeout(0);
      const head = parseIcecastRequestHead(buffered.subarray(0, end).toString("latin1"));
      const rest = new Uint8Array(buffered.subarray(end));
      if (head === null) {
        respond(socket, "400 Bad Request", []);
        return;
      }
      if (head.method === "SOURCE" || (head.method === "PUT" && !head.path.startsWith("/admin"))) {
        handleSource(socket, head, rest);
      } else if (head.path.startsWith("/admin/")) {
        handleAdmin(socket, head);
      } else {
        respond(socket, "404 Not Found", []);
      }
    };
    socket.on("data", onData);
  };

  return {
    start() {
      return new Promise<number>((resolve, reject) => {
        const created = createServer(handleConnection);
        created.once("error", reject);
        created.listen(options.port ?? 8000, host, () => {
          created.removeListener("error", reject);
          created.on("error", () => undefined);
          server = created;
          resolve((created.address() as AddressInfo).port);
        });
      });
    },
    stop() {
      return new Promise<void>((resolve) => {
        const current = server;
        server = null;
        for (const socket of sockets) socket.destroy();
        sockets.clear();
        if (current === null) {
          resolve();
          return;
        }
        current.close(() => resolve());
      });
    },
    port() {
      const address = server?.address();
      return address && typeof address === "object" ? address.port : null;
    },
    sourceCount: () => sources,
  };
}
