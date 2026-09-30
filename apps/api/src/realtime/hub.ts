import type { FastifyBaseLogger } from "fastify";
import type { WebSocket } from "ws";
import {
  clientMessageSchema,
  serverEventSchema,
  type RealtimeRole,
  type ServerEvent,
} from "@joymusic/shared";
import type { Deps } from "../deps";
import { forPublicAudience } from "../modules/requests/mapper";
import type { VenueRecord } from "../modules/venues/service";
import { buildVenueState, type Audience } from "../modules/venues/state";
import { venueChannel } from "./publisher";

const openState = 1;
const closeGoingAway = 1001;
const closePolicy = 1008;
const closeInternal = 1011;
const messageWindowMs = 10_000;
const messageBudget = 30;
const invalidMessageBudget = 10;
const snapshotBufferLimit = 500;

export interface ConnectionContext {
  venue: VenueRecord;
  role: RealtimeRole;
  deviceId: string | null;
}

interface Connection {
  socket: WebSocket;
  venueId: string;
  audience: Audience;
  deviceId: string | null;
  ready: boolean;
  snapshotting: boolean;
  buffer: ServerEvent[];
  alive: boolean;
  windowStartedAt: number;
  windowCount: number;
  invalidCount: number;
  venue: VenueRecord;
}

interface VenueChannel {
  connections: Set<Connection>;
  subscription: Promise<() => Promise<void>>;
}

export interface RealtimeHub {
  accept(socket: WebSocket, context: ConnectionContext): void;
  connectionCount(): number;
  close(): Promise<void>;
}

export function audienceOf(role: RealtimeRole): Audience {
  return role === "dj" ? "dj" : "public";
}

export function eventForAudience(event: ServerEvent, audience: Audience): ServerEvent {
  if (audience === "dj" || event.type !== "request.upserted") return event;
  return { ...event, data: { request: forPublicAudience(event.data.request) } };
}

export function createRealtimeHub(deps: Deps, log: FastifyBaseLogger): RealtimeHub {
  const { pubsub, sequences, config } = deps;
  const limits = config.realtime;
  const channels = new Map<string, VenueChannel>();
  const all = new Set<Connection>();

  function send(connection: Connection, payload: string): void {
    const { socket } = connection;
    if (socket.readyState !== openState) return;
    if (socket.bufferedAmount > limits.maxBufferedBytes) {
      socket.terminate();
      return;
    }
    socket.send(payload);
  }

  function deliver(connection: Connection, event: ServerEvent): void {
    if (!connection.ready) {
      if (connection.buffer.length >= snapshotBufferLimit) {
        connection.socket.close(closeInternal, "overloaded");
        return;
      }
      connection.buffer.push(event);
      return;
    }
    send(connection, JSON.stringify(eventForAudience(event, connection.audience)));
  }

  function onChannelMessage(venueId: string, message: string): void {
    const channel = channels.get(venueId);
    if (!channel) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    const event = serverEventSchema.safeParse(parsed);
    if (!event.success) return;
    const djPayload = JSON.stringify(event.data);
    const publicPayload = JSON.stringify(eventForAudience(event.data, "public"));
    for (const connection of channel.connections) {
      if (!connection.ready) {
        deliver(connection, event.data);
        continue;
      }
      send(connection, connection.audience === "dj" ? djPayload : publicPayload);
    }
  }

  async function attach(connection: Connection): Promise<void> {
    let channel = channels.get(connection.venueId);
    if (!channel) {
      channel = {
        connections: new Set(),
        subscription: pubsub.subscribe(venueChannel(connection.venueId), (message) =>
          onChannelMessage(connection.venueId, message),
        ),
      };
      channels.set(connection.venueId, channel);
    }
    channel.connections.add(connection);
    await channel.subscription;
  }

  function detach(connection: Connection): void {
    all.delete(connection);
    const channel = channels.get(connection.venueId);
    if (!channel) return;
    channel.connections.delete(connection);
    if (channel.connections.size > 0) return;
    channels.delete(connection.venueId);
    void channel.subscription
      .then((unsubscribe) => unsubscribe())
      .catch((error: unknown) => log.warn({ err: error }, "failed to unsubscribe venue channel"));
  }

  async function sendSnapshot(connection: Connection): Promise<void> {
    if (connection.snapshotting) return;
    connection.snapshotting = true;
    connection.ready = false;
    connection.buffer = [];
    try {
      const state = await buildVenueState(deps, connection.venue, {
        audience: connection.audience,
        deviceId: connection.deviceId,
      });
      const snapshot: ServerEvent = {
        type: "state.snapshot",
        seq: state.seq,
        venueId: connection.venueId,
        at: state.serverTime,
        data: state,
      };
      send(connection, JSON.stringify(snapshot));
      const pending = connection.buffer;
      connection.buffer = [];
      connection.ready = true;
      for (const event of pending) {
        if (event.seq > state.seq) deliver(connection, event);
      }
    } catch (error) {
      log.error({ err: error, venueId: connection.venueId }, "failed to send state snapshot");
      connection.socket.close(closeInternal, "snapshot_failed");
    } finally {
      connection.snapshotting = false;
    }
  }

  async function handleMessage(connection: Connection, raw: string): Promise<void> {
    const parsed = clientMessageSchema.safeParse(safeJson(raw));
    if (!parsed.success) {
      connection.invalidCount += 1;
      if (connection.invalidCount > invalidMessageBudget) {
        connection.socket.close(closePolicy, "invalid_messages");
      }
      return;
    }
    const message = parsed.data;
    if (message.type === "ping") {
      send(connection, JSON.stringify({ type: "pong", serverTime: new Date().toISOString() }));
      return;
    }
    if (connection.snapshotting || !connection.ready) return;
    const current = await sequences.current(connection.venueId);
    if (message.lastSeq !== current) await sendSnapshot(connection);
  }

  function withinMessageBudget(connection: Connection): boolean {
    const now = Date.now();
    if (now - connection.windowStartedAt > messageWindowMs) {
      connection.windowStartedAt = now;
      connection.windowCount = 0;
    }
    connection.windowCount += 1;
    return connection.windowCount <= messageBudget;
  }

  const heartbeat = setInterval(() => {
    for (const connection of all) {
      if (!connection.alive) {
        connection.socket.terminate();
        continue;
      }
      connection.alive = false;
      try {
        connection.socket.ping();
      } catch {
        connection.socket.terminate();
      }
    }
  }, limits.heartbeatMs);
  heartbeat.unref();

  return {
    accept(socket, context) {
      const connection: Connection = {
        socket,
        venue: context.venue,
        venueId: context.venue.id,
        audience: audienceOf(context.role),
        deviceId: context.deviceId,
        ready: false,
        snapshotting: false,
        buffer: [],
        alive: true,
        windowStartedAt: Date.now(),
        windowCount: 0,
        invalidCount: 0,
      };
      all.add(connection);
      socket.on("pong", () => {
        connection.alive = true;
      });
      socket.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        connection.alive = true;
        if (isBinary) {
          socket.close(1003, "text_only");
          return;
        }
        if (!withinMessageBudget(connection)) {
          socket.close(closePolicy, "rate_limited");
          return;
        }
        void handleMessage(connection, rawText(data)).catch((error: unknown) => {
          log.warn({ err: error }, "realtime message handling failed");
        });
      });
      socket.on("close", () => detach(connection));
      socket.on("error", () => socket.terminate());
      attach(connection)
        .then(() => sendSnapshot(connection))
        .catch((error: unknown) => {
          log.error({ err: error }, "failed to attach realtime connection");
          socket.close(closeInternal, "attach_failed");
        });
    },
    connectionCount: () => all.size,
    async close() {
      clearInterval(heartbeat);
      for (const connection of all) connection.socket.close(closeGoingAway, "server_shutdown");
      const subscriptions = [...channels.values()].map((channel) => channel.subscription);
      channels.clear();
      all.clear();
      await Promise.all(
        subscriptions.map((pending) =>
          pending.then((unsubscribe) => unsubscribe()).catch(() => undefined),
        ),
      );
    },
  };
}

function rawText(data: Buffer | ArrayBuffer | Buffer[]): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return data.toString("utf8");
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
