import type { RequestItem, VenueState } from "@joymusic/shared";

export interface ConsoleView {
  incoming: RequestItem[];
  allIncoming: RequestItem[];
  queue: RequestItem[];
  deferred: ReadonlySet<string>;
}

export function deriveConsoleView(
  state: VenueState | null,
  deferredOrder: readonly string[],
  pendingOrder: readonly string[] | null,
): ConsoleView {
  const deferred = new Set(deferredOrder);
  if (!state) return { incoming: [], allIncoming: [], queue: [], deferred };
  const fresh = state.pending.filter((item) => !deferred.has(item.id));
  const later = deferredOrder
    .map((id) => state.pending.find((item) => item.id === id))
    .filter((item): item is RequestItem => item !== undefined);
  let queue = state.queue;
  if (pendingOrder) {
    const positions = new Map(pendingOrder.map((id, index) => [id, index]));
    const known = queue.filter((item) => positions.has(item.id));
    const rest = queue.filter((item) => !positions.has(item.id));
    queue = [
      ...[...known].sort(
        (left, right) => (positions.get(left.id) ?? 0) - (positions.get(right.id) ?? 0),
      ),
      ...rest,
    ];
  }
  return { incoming: fresh, allIncoming: [...fresh, ...later], queue, deferred };
}

export function stepSelection(
  ids: readonly string[],
  current: string | null,
  delta: 1 | -1,
): string | null {
  if (ids.length === 0) return null;
  const index = current === null ? -1 : ids.indexOf(current);
  if (index === -1) return ids[delta === 1 ? 0 : ids.length - 1] ?? null;
  const next = Math.min(ids.length - 1, Math.max(0, index + delta));
  return ids[next] ?? null;
}

export function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
