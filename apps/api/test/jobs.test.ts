import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { djSessions, requests } from "../src/db/schema";
import { createJobScheduler } from "../src/modules/jobs/scheduler";
import {
  createJobTasks,
  endAbandonedSessions,
  expireStalePendingRequests,
} from "../src/modules/jobs/tasks";
import type { TestContext } from "./helpers/context";
import { startSession } from "./helpers/factories";
import { createFixture, newContext } from "./helpers/flow";

const minute = 60_000;
const hour = 60 * minute;

describe("background jobs", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await newContext();
  });
  afterAll(async () => {
    await context.close();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function pendingRequest(
    fixture: Awaited<ReturnType<typeof createFixture>>,
    trackId: string,
  ) {
    const guest = await fixture.guest();
    const created = await fixture.api.ok("requestCreate", {
      token: guest.token,
      params: { slug: fixture.venue.slug },
      body: { trackId },
    });
    return created.request.id;
  }

  async function statusOf(id: string) {
    const [row] = await context.deps.db.select().from(requests).where(eq(requests.id, id));
    return row?.status;
  }

  it("expires pending requests older than 45 minutes and publishes them", async () => {
    const fixture = await createFixture(context);
    const old = await pendingRequest(fixture, "deezer:101");
    const fresh = await pendingRequest(fixture, "deezer:102");
    const accepted = await pendingRequest(fixture, "deezer:103");
    await fixture.api.ok("djRequestAccept", {
      token: fixture.owner.accessToken,
      params: { id: accepted },
    });
    const ancient = new Date(Date.now() - 50 * minute);
    await context.deps.db.update(requests).set({ createdAt: ancient }).where(eq(requests.id, old));
    await context.deps.db
      .update(requests)
      .set({ createdAt: ancient })
      .where(eq(requests.id, accepted));
    context.publisher.publish.mockClear();

    const count = await expireStalePendingRequests(context.deps, context.app.log, new Date());
    expect(count).toBeGreaterThanOrEqual(1);
    expect(await statusOf(old)).toBe("expired");
    expect(await statusOf(fresh)).toBe("pending");
    expect(await statusOf(accepted)).toBe("accepted");
    const events = context.publisher.publish.mock.calls
      .filter((call) => call[0] === fixture.venue.id)
      .map(
        (call) => call[1] as { type: string; data: { request: { id: string; status: string } } },
      );
    expect(events).toHaveLength(1);
    expect(events[0]?.data.request).toMatchObject({ id: old, status: "expired" });
    const state = await fixture.api.ok("venueState", { params: { slug: fixture.venue.slug } });
    expect(state.pending.map((item) => item.id)).toEqual([fresh]);
  });

  it("ends sessions idle for more than 18 hours and keeps active ones", async () => {
    const fixture = await createFixture(context, { startSession: false });
    const idleVenue = await createFixture(context, { startSession: false, owner: fixture.owner });
    const abandoned = await startSession(
      context,
      idleVenue.venue.id,
      fixture.owner.userId,
      new Date(Date.now() - 20 * hour),
    );
    const running = await startSession(context, fixture.venue.id, fixture.owner.userId, new Date());
    const busy = await createFixture(context, { startSession: false, owner: fixture.owner });
    const busySession = await startSession(
      context,
      busy.venue.id,
      fixture.owner.userId,
      new Date(Date.now() - 20 * hour),
    );
    await context.deps.db.insert(requests).values({
      id: "req_busy_recent",
      sessionId: busySession,
      venueId: busy.venue.id,
      title: "Recent",
      artist: "Someone",
      deviceId: "device-busy-1",
      status: "pending",
    });
    context.publisher.publish.mockClear();

    const ended = await endAbandonedSessions(context.deps, context.app.log, new Date());
    expect(ended).toBeGreaterThanOrEqual(1);
    const rows = await context.deps.db.select().from(djSessions);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(abandoned)?.endedAt).not.toBeNull();
    expect(byId.get(running)?.endedAt).toBeNull();
    expect(byId.get(busySession)?.endedAt).toBeNull();
    const published = context.publisher.publish.mock.calls
      .filter((call) => call[0] === idleVenue.venue.id)
      .map((call) => (call[1] as { type: string }).type);
    expect(published).toEqual(["session.changed"]);
  });

  it("runs tasks on the interval, skips overlapping passes and stops cleanly", async () => {
    vi.useFakeTimers();
    const gate: { release: () => void } = { release: () => undefined };
    const run = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          gate.release = () => resolve(1);
        }),
    );
    const failing = vi.fn(() => Promise.reject(new Error("boom")));
    const onError = vi.fn();
    const scheduler = createJobScheduler(
      [
        { name: "slow", run },
        { name: "failing", run: failing },
      ],
      { intervalMs: 1000, onError },
    );
    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(1);
    gate.release();
    await vi.advanceTimersByTimeAsync(0);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("failing", expect.any(Error));
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
    gate.release();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("wires the tasks to the database through the app plugin", async () => {
    const enabled = await newContext({ env: { JOBS_ENABLED: "true", JOBS_INTERVAL_SECONDS: "1" } });
    try {
      expect(enabled.config.jobs.enabled).toBe(true);
      expect(createJobTasks(enabled.deps, enabled.app.log).map((task) => task.name)).toEqual([
        "expire-pending-requests",
        "end-abandoned-sessions",
      ]);
    } finally {
      await enabled.close();
    }
    expect(context.config.jobs.enabled).toBe(false);
  });

  it("expires through the scheduled plugin when enabled", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const enabled = await newContext({ env: { JOBS_ENABLED: "true", JOBS_INTERVAL_SECONDS: "1" } });
    try {
      const fixture = await createFixture(enabled);
      const guest = await fixture.guest();
      const created = await fixture.api.ok("requestCreate", {
        token: guest.token,
        params: { slug: fixture.venue.slug },
        body: { trackId: "deezer:101" },
      });
      await enabled.deps.db
        .update(requests)
        .set({ createdAt: new Date(Date.now() - 60 * minute) })
        .where(eq(requests.id, created.request.id));
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(async () => {
        const [row] = await enabled.deps.db
          .select()
          .from(requests)
          .where(eq(requests.id, created.request.id));
        expect(row?.status).toBe("expired");
      });
    } finally {
      await enabled.close();
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
