import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RequestItem, VenueState } from "@joymusic/shared";
import { useToast } from "@joymusic/ui";
import type { RealtimeConnectionStatus, SessionContext } from "../../../common/bridge";
import type { OutboxCommand } from "../../../common/commands";
import { useT } from "../../i18n";
import { runCommand } from "../../lib/api";
import { describeError } from "../../lib/errors";
import { useRealtime, useTopic } from "../../lib/topics";
import { deriveConsoleView, sameOrder, stepSelection } from "./derive";
import type { ConsoleIntent } from "./intents";
import { applyPendingCommands, moveId } from "./overlay";

export type IncomingTab = "new" | "all";

export interface ConsoleController {
  state: VenueState | null;
  status: RealtimeConnectionStatus;
  offsetMs: number;
  loaded: boolean;
  sessionEnded: boolean;
  incoming: RequestItem[];
  queue: RequestItem[];
  deferred: ReadonlySet<string>;
  incomingTab: IncomingTab;
  setIncomingTab(tab: IncomingTab): void;
  selectedIncomingId: string | null;
  selectedQueueId: string | null;
  selectIncoming(id: string): void;
  selectQueue(id: string): void;
  declineTarget: RequestItem | null;
  closeDecline(): void;
  perform(intent: ConsoleIntent): void;
  accept(id: string): void;
  decline(id: string, reason?: string): void;
  later(id: string): void;
  play(id: string): void;
  played(): void;
  reorder(order: string[]): void;
  setRequestsOpen(open: boolean): void;
  requestDecline(request: RequestItem): void;
  requestsOpen: boolean;
}

export function useConsole(session: SessionContext): ConsoleController {
  const t = useT();
  const toast = useToast();
  const realtime = useRealtime({ venue: session.venueSlug, role: "dj" });
  const outbox = useTopic("outbox");
  const [deferredOrder, setDeferredOrder] = useState<string[]>([]);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [incomingTab, setIncomingTab] = useState<IncomingTab>("new");
  const [selectedIncoming, setSelectedIncoming] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<RequestItem | null>(null);

  const raw = realtime?.state ?? null;
  const commands = useMemo(() => outbox.entries.map((entry) => entry.command), [outbox.entries]);
  const state = useMemo(
    () => (raw ? applyPendingCommands(raw, commands, Date.now()) : null),
    [raw, commands],
  );
  const view = useMemo(
    () => deriveConsoleView(state, deferredOrder, pendingOrder),
    [state, deferredOrder, pendingOrder],
  );

  const serverQueueIds = useMemo(() => raw?.queue.map((item) => item.id) ?? [], [raw]);
  useEffect(() => {
    if (!pendingOrder) return;
    const known = serverQueueIds.filter((id) => pendingOrder.includes(id));
    if (
      sameOrder(
        known,
        pendingOrder.filter((id) => serverQueueIds.includes(id)),
      )
    ) {
      setPendingOrder(null);
    }
  }, [serverQueueIds, pendingOrder]);

  const visibleIncoming = incomingTab === "new" ? view.incoming : view.allIncoming;
  const incomingIds = useMemo(() => visibleIncoming.map((item) => item.id), [visibleIncoming]);
  const queueIds = useMemo(() => view.queue.map((item) => item.id), [view.queue]);
  const selectedIncomingId =
    selectedIncoming && incomingIds.includes(selectedIncoming)
      ? selectedIncoming
      : (incomingIds[0] ?? null);
  const selectedQueueId =
    selectedQueue && queueIds.includes(selectedQueue) ? selectedQueue : (queueIds[0] ?? null);

  const latest = useRef({ state, view, selectedIncomingId, selectedQueueId, visibleIncoming });
  latest.current = { state, view, selectedIncomingId, selectedQueueId, visibleIncoming };

  const send = useCallback(
    async (command: OutboxCommand): Promise<boolean> => {
      try {
        const outcome = await runCommand(command);
        if (outcome.status === "queued")
          toast.toast({ id: "queued-offline", title: t.queuedToast, tone: "next" });
        return true;
      } catch (error) {
        toast.error(describeError(t, error));
        return false;
      }
    },
    [t, toast],
  );

  const accept = useCallback((id: string) => void send({ kind: "accept", requestId: id }), [send]);
  const decline = useCallback(
    (id: string, reason?: string) => {
      setDeclineTarget(null);
      const trimmed = reason?.trim();
      void send({ kind: "decline", requestId: id, ...(trimmed ? { reason: trimmed } : {}) });
    },
    [send],
  );
  const later = useCallback((id: string) => {
    setDeferredOrder((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }, []);
  const play = useCallback((id: string) => void send({ kind: "play", requestId: id }), [send]);
  const played = useCallback(() => {
    const current = latest.current.state?.nowPlaying;
    if (!current) return;
    if (current.requestId) void send({ kind: "played", requestId: current.requestId });
    else void send({ kind: "nowplaying.clear", sessionId: session.sessionId });
  }, [send, session.sessionId]);
  const reorder = useCallback(
    (order: string[]) => {
      setPendingOrder(order);
      void send({ kind: "reorder", sessionId: session.sessionId, order }).then((ok) => {
        if (!ok) setPendingOrder(null);
      });
    },
    [send, session.sessionId],
  );
  const requestsOpen = state?.venue.settings.requestsOpen ?? true;
  const setRequestsOpen = useCallback(
    (open: boolean) =>
      void send({ kind: "settings", sessionId: session.sessionId, patch: { requestsOpen: open } }),
    [send, session.sessionId],
  );

  const perform = useCallback(
    (intent: ConsoleIntent) => {
      const current = latest.current;
      const incomingTarget = current.visibleIncoming.find(
        (item) => item.id === current.selectedIncomingId,
      );
      const queueIdList = current.view.queue.map((item) => item.id);
      switch (intent.type) {
        case "accept":
          if (incomingTarget) accept(incomingTarget.id);
          return;
        case "decline":
          if (incomingTarget) setDeclineTarget(incomingTarget);
          return;
        case "declineNow":
          if (incomingTarget) decline(incomingTarget.id);
          return;
        case "later":
          if (incomingTarget) later(incomingTarget.id);
          return;
        case "playNext": {
          const first = current.view.queue[0];
          if (first) play(first.id);
          return;
        }
        case "playSelected": {
          const target = current.view.queue.find((item) => item.id === current.selectedQueueId);
          if (target) play(target.id);
          return;
        }
        case "markPlayed":
          played();
          return;
        case "toggleRequests":
          setRequestsOpen(!(current.state?.venue.settings.requestsOpen ?? true));
          return;
        case "moveIncoming":
          setSelectedIncoming(
            stepSelection(
              current.visibleIncoming.map((item) => item.id),
              current.selectedIncomingId,
              intent.delta,
            ),
          );
          return;
        case "moveQueue":
          setSelectedQueue(stepSelection(queueIdList, current.selectedQueueId, intent.delta));
          return;
        case "reorderQueue": {
          const id = current.selectedQueueId;
          if (!id) return;
          const from = queueIdList.indexOf(id);
          const to = from + intent.delta;
          if (from < 0 || to < 0 || to >= queueIdList.length) return;
          reorder(moveId(queueIdList, from, to));
          return;
        }
      }
    },
    [accept, decline, later, play, played, reorder, setRequestsOpen],
  );

  const sessionEnded = raw !== null && raw.session?.id !== session.sessionId;

  return {
    state,
    status: realtime?.status ?? "connecting",
    offsetMs: realtime?.offsetMs ?? 0,
    loaded: raw !== null,
    sessionEnded,
    incoming: visibleIncoming,
    queue: view.queue,
    deferred: view.deferred,
    incomingTab,
    setIncomingTab,
    selectedIncomingId,
    selectedQueueId,
    selectIncoming: setSelectedIncoming,
    selectQueue: setSelectedQueue,
    declineTarget,
    closeDecline: () => setDeclineTarget(null),
    perform,
    accept,
    decline,
    later,
    play,
    played,
    reorder,
    setRequestsOpen,
    requestDecline: setDeclineTarget,
    requestsOpen,
  };
}
