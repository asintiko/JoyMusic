import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import {
  Button,
  EmptyState,
  IconButton,
  Kbd,
  QueueItem,
  Tabs,
  TabsList,
  TabsTrigger,
  cx,
} from "@joymusic/ui";
import type { RequestItem } from "@joymusic/shared";
import { useT } from "../../i18n";
import { useNow } from "../../lib/topics";
import type { ConsoleController } from "./use-console";
import { Panel } from "./panel";

export interface IncomingPanelProps {
  controller: ConsoleController;
  offsetMs: number;
  large: boolean;
}

export function minutesAgo(createdAt: string, now: number, offsetMs: number): number {
  return Math.max(0, Math.floor((now + offsetMs - Date.parse(createdAt)) / 60_000));
}

export function IncomingPanel({ controller, offsetMs, large }: IncomingPanelProps) {
  const t = useT();
  const now = useNow(15_000);
  const { incoming, deferred, selectedIncomingId, requestsOpen } = controller;
  const buttonSize = large ? "md" : "sm";

  const renderCard = (request: RequestItem) => {
    const minutes = minutesAgo(request.createdAt, now, offsetMs);
    const isDeferred = deferred.has(request.id);
    return (
      <div
        key={request.id}
        role="presentation"
        className={cx("contents", isDeferred && "[&>*]:opacity-60")}
        data-request-id={request.id}
        onClick={() => controller.selectIncoming(request.id)}
      >
        <QueueItem
          request={request}
          variant="incoming"
          highlighted={request.id === selectedIncomingId}
          ago={t.ago(minutes)}
          votesLabel={t.votes}
          dedicationText={request.dedicatedTo ? t.dedicationFor(request.dedicatedTo) : undefined}
          actions={
            <>
              <Button
                size={buttonSize}
                data-action="accept"
                leftIcon={<Check aria-hidden="true" className="size-4" />}
                className="flex-1"
                onClick={() => controller.accept(request.id)}
              >
                {t.accept}
              </Button>
              <Button
                size={buttonSize}
                variant="secondary"
                data-action="later"
                onClick={() => controller.later(request.id)}
              >
                {isDeferred ? t.restore : t.later}
              </Button>
              <IconButton
                label={t.decline}
                data-action="decline"
                icon={<X aria-hidden="true" className="size-4" />}
                variant="danger"
                size={large ? "md" : "sm"}
                onClick={() => controller.requestDecline(request)}
              />
            </>
          }
        />
      </div>
    );
  };

  return (
    <Panel
      id="incoming"
      title={t.incomingTitle}
      count={incoming.length}
      action={
        <Tabs
          value={controller.incomingTab}
          onValueChange={(value) => controller.setIncomingTab(value === "all" ? "all" : "new")}
          variant="segmented"
        >
          <TabsList className="!p-0.5">
            <TabsTrigger value="new" className="!h-7 !px-3 !text-[12px]">
              {t.incomingNew}
            </TabsTrigger>
            <TabsTrigger value="all" className="!h-7 !px-3 !text-[12px]">
              {t.incomingAll}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {incoming.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <EmptyState
            size="sm"
            illustration={requestsOpen ? "inbox" : "closed"}
            title={requestsOpen ? t.incomingEmpty : t.incomingClosed}
            description={requestsOpen ? t.incomingEmptyBody : t.incomingClosedBody}
            action={
              requestsOpen ? undefined : (
                <Button size="sm" onClick={() => controller.setRequestsOpen(true)}>
                  {t.openRequests}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div
          role="list"
          aria-label={t.incomingTitle}
          className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3"
        >
          {incoming.map(renderCard)}
        </div>
      )}
      <footer className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-[11.5px] font-semibold text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>A</Kbd>
          {t.accept}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>D</Kbd>
          {t.decline}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>L</Kbd>
          {t.later}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <Kbd>
            <ArrowUp aria-label={t.arrowUp} />
          </Kbd>
          <Kbd>
            <ArrowDown aria-label={t.arrowDown} />
          </Kbd>
        </span>
      </footer>
    </Panel>
  );
}
