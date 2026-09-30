"use client";

import { Check, Gift, ThumbsUp } from "lucide-react";
import { memo } from "react";
import type { RequestItem } from "@joymusic/shared";
import { EmptyState, cx } from "@joymusic/ui";
import { useI18n } from "@/components/i18n";
import { artworkSrc } from "@/lib/art";
import { LiteCover } from "./lite-cover";

export interface UpNextProps {
  queue: RequestItem[];
  pending: RequestItem[];
  canVote: boolean;
  onVote: (request: RequestItem) => void;
  votingId: string | null;
  className?: string;
}

function RowView({
  request,
  position,
  canVote,
  busy,
  onVote,
}: {
  request: RequestItem;
  position: number;
  canVote: boolean;
  busy: boolean;
  onVote: (request: RequestItem) => void;
}) {
  const { t } = useI18n();
  const seed = `${request.artist} ${request.title}`;
  return (
    <div
      role="listitem"
      data-testid="queue-row"
      data-request-id={request.id}
      data-mine={request.mine || undefined}
      className={cx(
        "relative flex items-center gap-3 rounded-lg px-2 py-2",
        request.mine && "bg-brand-soft",
      )}
    >
      {request.mine ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2.5 left-0 w-0.5 rounded-pill bg-brand-gradient"
        />
      ) : null}
      <span className="type-mono w-5 shrink-0 text-center text-[12px] text-fg-subtle">
        {position}
      </span>
      <LiteCover src={artworkSrc(request.artworkUrl, 120)} seed={seed} size={52} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-tight tracking-[-0.01em]">
          {request.title}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-fg-muted">{request.artist}</p>
        {request.dedicatedTo ? (
          <p className="mt-1 flex items-center gap-1 truncate text-[12px] font-semibold text-brand">
            <Gift aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{t.dedicationFor(request.dedicatedTo)}</span>
          </p>
        ) : null}
      </div>
      {request.mine ? (
        <span
          data-testid="mine-badge"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-pill bg-playing-soft px-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-playing-fg"
        >
          <Check aria-hidden="true" className="size-3.5" />
          {t.mine}
        </span>
      ) : canVote ? (
        <button
          type="button"
          data-testid="vote-button"
          disabled={busy}
          aria-label={`${t.vote}: ${request.title}`}
          onClick={() => onVote(request)}
          className={cx(
            "focus-ring type-mono inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-surface-3 px-3 text-[12.5px] text-fg hairline-strong transition-[background-color,transform] hover:bg-surface-4 active:scale-95",
            busy && "opacity-60",
          )}
        >
          <ThumbsUp aria-hidden="true" className="size-4" />
          {request.votes}
        </button>
      ) : request.votes > 1 ? (
        <span className="type-mono inline-flex h-8 shrink-0 items-center gap-1 rounded-pill bg-surface-3 px-2.5 text-[12px] text-fg-muted">
          <ThumbsUp aria-hidden="true" className="size-3" />
          {request.votes}
        </span>
      ) : null}
    </div>
  );
}

const Row = memo(RowView);

function UpNextView({ queue, pending, canVote, onVote, votingId, className }: UpNextProps) {
  const { t } = useI18n();
  const shownQueue = queue.slice(0, 6);
  const shownPending = pending.slice(0, 5);
  const empty = shownQueue.length === 0 && shownPending.length === 0;

  if (empty) {
    return (
      <section className={className} aria-label={t.upNext}>
        <EmptyState
          illustration="queue"
          size="sm"
          title={t.emptyQueueTitle}
          description={t.emptyQueueText}
        />
      </section>
    );
  }

  return (
    <div className={cx("flex flex-col gap-5", className)}>
      {shownQueue.length > 0 ? (
        <section aria-label={t.upNext} data-testid="up-next">
          <h3 className="type-eyebrow px-2 pb-2 text-fg-subtle">{t.upNext}</h3>
          <div role="list" className="flex flex-col gap-0.5">
            {shownQueue.map((request, index) => (
              <Row
                key={request.id}
                request={request}
                position={index + 1}
                canVote={canVote}
                busy={votingId === request.id}
                onVote={onVote}
              />
            ))}
          </div>
        </section>
      ) : null}
      {shownPending.length > 0 ? (
        <section aria-label={t.waitingForVotes} data-testid="pending-list">
          <h3 className="type-eyebrow px-2 pb-2 text-fg-subtle">{t.waitingForVotes}</h3>
          <div role="list" className="flex flex-col gap-0.5">
            {shownPending.map((request, index) => (
              <Row
                key={request.id}
                request={request}
                position={index + 1}
                canVote={canVote}
                busy={votingId === request.id}
                onVote={onVote}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export const UpNext = memo(UpNextView);
