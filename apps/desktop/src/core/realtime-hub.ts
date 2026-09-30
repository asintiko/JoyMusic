import { applyServerEvent, createRealtimeClient, serverOffset } from "@joymusic/shared";
import type { RealtimeClient, VenueState } from "@joymusic/shared";
import type { RealtimeConnectionStatus, RealtimeTarget, RealtimeUpdate } from "../common/bridge";
import type { AuthService } from "./auth-service";
import type { CoreEnvironment } from "./environment";

type Listener = (update: RealtimeUpdate) => void;

interface Connection {
  target: RealtimeTarget;
  client: RealtimeClient;
  listeners: Set<Listener>;
  state: VenueState | null;
  status: RealtimeConnectionStatus;
  offsetMs: number;
}

function keyOf(target: RealtimeTarget): string {
  return `${target.role}:${target.venue}`;
}

export function createRealtimeHub(
  env: CoreEnvironment,
  auth: AuthService,
  options: { onClosed?: () => void } = {},
) {
  const connections = new Map<string, Connection>();

  const emit = (connection: Connection) => {
    const update: RealtimeUpdate = {
      target: connection.target,
      state: connection.state,
      status: connection.status,
      offsetMs: connection.offsetMs,
      receivedAt: env.now(),
    };
    for (const listener of [...connection.listeners]) listener(update);
  };

  const open = (target: RealtimeTarget): Connection => {
    const connection: Connection = {
      target,
      client: undefined as unknown as RealtimeClient,
      listeners: new Set(),
      state: null,
      status: "connecting",
      offsetMs: 0,
    };
    connection.client = createRealtimeClient({
      baseUrl: env.config.apiUrl,
      venue: target.venue,
      role: target.role,
      WebSocketImpl: env.WebSocketImpl,
      getToken: async () => {
        if (target.role !== "dj") return null;
        try {
          return await auth.getAccessToken();
        } catch {
          return null;
        }
      },
      onStatus: (status) => {
        connection.status = status;
        emit(connection);
        if (status === "closed") options.onClosed?.();
      },
      onEvent: (event) => {
        if (event.type === "state.snapshot") {
          connection.state = event.data;
          connection.offsetMs = serverOffset(event.data.serverTime, env.now());
        } else if (connection.state) {
          connection.state = applyServerEvent(connection.state, event);
          connection.offsetMs = serverOffset(event.at, env.now());
        } else {
          return;
        }
        emit(connection);
      },
    });
    connection.client.start();
    return connection;
  };

  return {
    subscribe(target: RealtimeTarget, listener: Listener): () => void {
      const key = keyOf(target);
      let connection = connections.get(key);
      if (!connection) {
        connection = open(target);
        connections.set(key, connection);
      }
      connection.listeners.add(listener);
      listener({
        target,
        state: connection.state,
        status: connection.status,
        offsetMs: connection.offsetMs,
        receivedAt: env.now(),
      });
      const joined = connection;
      return () => {
        joined.listeners.delete(listener);
        if (joined.listeners.size === 0 && connections.get(key) === joined) {
          connections.delete(key);
          joined.client.stop();
        }
      };
    },
    resyncAll() {
      for (const connection of connections.values()) connection.client.resync();
    },
    dispose() {
      for (const connection of connections.values()) connection.client.stop();
      connections.clear();
    },
  };
}

export type RealtimeHub = ReturnType<typeof createRealtimeHub>;
