import {
  clientMessageSchema,
  realtimePath,
  serverEventSchema,
  type ClientMessage,
  type RealtimeRole,
  type ServerEvent,
} from "./realtime";

export type RealtimeStatus = "connecting" | "open" | "closed";

export interface RealtimeClientOptions {
  baseUrl: string;
  venue: string;
  role: RealtimeRole;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  onEvent: (event: ServerEvent) => void;
  onStatus?: (status: RealtimeStatus) => void;
  onGap?: () => void;
  WebSocketImpl?: typeof WebSocket;
  heartbeatMs?: number;
  minBackoffMs?: number;
  maxBackoffMs?: number;
}

function toWebSocketUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "").replace(/^http/, "ws");
}

export function createRealtimeClient(options: RealtimeClientOptions) {
  const Impl = options.WebSocketImpl ?? globalThis.WebSocket;
  const heartbeatMs = options.heartbeatMs ?? 20_000;
  const minBackoff = options.minBackoffMs ?? 500;
  const maxBackoff = options.maxBackoffMs ?? 15_000;

  let socket: WebSocket | null = null;
  let stopped = false;
  let attempt = 0;
  let lastSeq: number | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let reconnect: ReturnType<typeof setTimeout> | null = null;

  function send(message: ClientMessage) {
    if (socket?.readyState === Impl.OPEN)
      socket.send(JSON.stringify(clientMessageSchema.parse(message)));
  }

  function clearTimers() {
    if (heartbeat) clearInterval(heartbeat);
    if (reconnect) clearTimeout(reconnect);
    heartbeat = null;
    reconnect = null;
  }

  function scheduleReconnect() {
    if (stopped) return;
    const delay = Math.min(maxBackoff, minBackoff * 2 ** attempt) * (0.7 + Math.random() * 0.6);
    attempt += 1;
    reconnect = setTimeout(() => void open(), delay);
  }

  function handleMessage(raw: unknown) {
    if (typeof raw !== "string") return;
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = serverEventSchema.safeParse(payload);
    if (!parsed.success) return;
    const event = parsed.data;
    if (event.type !== "state.snapshot" && lastSeq !== null && event.seq > lastSeq + 1) {
      options.onGap?.();
      send({ type: "resync", lastSeq });
    }
    if (event.type === "state.snapshot" || lastSeq === null || event.seq > lastSeq) {
      lastSeq = event.seq;
    }
    options.onEvent(event);
  }

  async function open() {
    if (stopped) return;
    options.onStatus?.("connecting");
    const token = await options.getToken?.();
    const query = new URLSearchParams({ venue: options.venue, role: options.role });
    if (token) query.set("token", token);
    const url = `${toWebSocketUrl(options.baseUrl)}${realtimePath}?${query.toString()}`;
    const current = new Impl(url);
    socket = current;
    current.onopen = () => {
      attempt = 0;
      options.onStatus?.("open");
      if (lastSeq !== null) send({ type: "resync", lastSeq });
      heartbeat = setInterval(() => send({ type: "ping" }), heartbeatMs);
    };
    current.onmessage = (message) => handleMessage(message.data);
    current.onclose = () => {
      clearTimers();
      options.onStatus?.("closed");
      scheduleReconnect();
    };
    current.onerror = () => current.close();
  }

  return {
    start() {
      stopped = false;
      void open();
    },
    stop() {
      stopped = true;
      clearTimers();
      socket?.close();
      socket = null;
    },
    resync() {
      send({ type: "resync", lastSeq: lastSeq ?? 0 });
    },
  };
}

export type RealtimeClient = ReturnType<typeof createRealtimeClient>;
