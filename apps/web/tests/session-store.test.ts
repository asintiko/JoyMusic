import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@joymusic/shared";
import {
  createGuestSessionStore,
  decodeTokenExpiry,
  generateDeviceId,
  withGuestRetry,
} from "@/guest/session-store";
import { createMemoryStore, createStorage } from "@/lib/storage";
import { makeJwt } from "./helpers";

function setup(options: { now?: number; storage?: ReturnType<typeof createMemoryStore> } = {}) {
  let now = options.now ?? 1_800_000_000_000;
  const storage = options.storage ?? createMemoryStore();
  const call = vi.fn(async (_name: string, _input?: unknown) => ({
    guestToken: makeJwt(now + 12 * 3_600_000),
    deviceId: "device-abcdefgh",
    tableLabel: "Table 4",
  }));
  const store = createGuestSessionStore({
    slug: "joy-demo-club",
    api: { call } as never,
    storage,
    locale: () => "ru",
    now: () => now,
    createDeviceId: () => "device-abcdefgh",
  });
  return {
    store,
    storage,
    call,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("decodeTokenExpiry", () => {
  it("reads exp from a JWT payload", () => {
    expect(decodeTokenExpiry(makeJwt(1_800_000_000_000))).toBe(1_800_000_000_000);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeTokenExpiry("nope")).toBeNull();
    expect(decodeTokenExpiry("a.b.c")).toBeNull();
  });
});

describe("generateDeviceId", () => {
  it("fits the API device id bounds", () => {
    const id = generateDeviceId();
    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id.length).toBeLessThanOrEqual(64);
  });
});

describe("guest session store", () => {
  it("joins once and reuses the token", async () => {
    const { store, call } = setup();
    const first = await store.ensure();
    const second = await store.ensure();
    expect(first).toBe(second);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[1]).toMatchObject({
      params: { slug: "joy-demo-club" },
      body: { deviceId: "device-abcdefgh", locale: "ru" },
    });
    expect(first.tableLabel).toBe("Table 4");
  });

  it("shares one join between concurrent callers", async () => {
    const { store, call } = setup();
    const [a, b, c] = await Promise.all([store.ensure(), store.ensure(), store.ensure()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expiring token", async () => {
    const { store, call, advance } = setup();
    await store.ensure();
    advance(11 * 3_600_000 + 59 * 60_000);
    await store.ensure();
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("restores a stored session for the same device after reload", async () => {
    const first = setup();
    await first.store.ensure();
    const second = setup({ storage: first.storage });
    const restored = await second.store.ensure();
    expect(second.call).not.toHaveBeenCalled();
    expect(restored.deviceId).toBe("device-abcdefgh");
  });

  it("keeps the same device id across venues", async () => {
    const storage = createMemoryStore();
    const first = setup({ storage });
    const other = createGuestSessionStore({
      slug: "other-place",
      api: first.call as never,
      storage,
      locale: () => "uz",
    });
    expect(other.deviceId()).toBe(first.store.deviceId());
  });

  it("invalidate forces a new join", async () => {
    const { store, call } = setup();
    await store.ensure();
    store.invalidate();
    expect(store.current()).toBeNull();
    await store.ensure();
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("sends the table token once per scan and rejoins even with a valid session", async () => {
    const { store, call } = setup();
    await store.ensure();
    store.setTableToken("tbl_abc");
    await store.ensure();
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[1]?.[1]).toMatchObject({ body: { tableToken: "tbl_abc" } });
    await store.refresh();
    expect(call.mock.calls[2]?.[1]).toMatchObject({ body: { tableToken: undefined } });
    expect(store.tableToken()).toBe("tbl_abc");
  });

  it("notifies subscribers", async () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    await store.ensure();
    store.invalidate();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[0]).toBeNull();
  });

  it("works when localStorage throws", async () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const { store, call } = setup({ storage: createStorage(broken) });
    await store.ensure();
    await store.ensure();
    expect(store.deviceId()).toBe("device-abcdefgh");
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe("withGuestRetry", () => {
  it("refreshes the token and retries once on 401", async () => {
    const { store, call } = setup();
    const inner = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401, "unauthorized", "expired"))
      .mockResolvedValueOnce({ ok: true });
    const api = withGuestRetry({ call: inner } as never, store);
    await store.ensure();
    const result = await api.call("requestsMine" as never, { params: { slug: "x" } } as never);
    expect(result).toEqual({ ok: true });
    expect(inner).toHaveBeenCalledTimes(2);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    const { store } = setup();
    const inner = vi.fn().mockRejectedValue(new ApiError(429, "request_limit_reached", "slow"));
    const api = withGuestRetry({ call: inner } as never, store);
    await expect(api.call("requestsMine" as never, {} as never)).rejects.toMatchObject({
      code: "request_limit_reached",
    });
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
