import { Gift, MessageSquareQuote, ThumbsUp, Users } from "lucide-react";
import type { RequestItem } from "@joymusic/shared";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { formatDuration } from "../lib/format";
import { Cover } from "./cover";
import { StatusPill } from "./status-pill";

export type QueueItemVariant = "guest" | "dj" | "tv" | "incoming";

export type QueueItemRequest = Pick<
  RequestItem,
  "title" | "artist" | "artworkUrl" | "status" | "votes" | "tableLabel" | "note" | "dedicatedTo"
> & { mine?: boolean; durationSec?: number | null };

export interface QueueItemProps {
  request: QueueItemRequest;
  variant?: QueueItemVariant;
  position?: number;
  statusLabel?: string;
  mineLabel?: string;
  dedicationText?: string;
  ago?: string;
  votesLabel?: string;
  actions?: ReactNode;
  handle?: ReactNode;
  highlighted?: boolean;
  className?: string;
}

function DedicationChip({ text, large }: { text: string; large?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-pill bg-brand-soft font-bold text-brand",
        large ? "h-9 px-4 text-[17px] [&_svg]:size-[18px]" : "h-6 px-2.5 text-[12px] [&_svg]:size-3.5",
      )}
    >
      <Gift aria-hidden="true" className="shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  );
}

function TableChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-xs bg-surface-3 px-1.5 text-[11px] font-bold text-fg-muted">
      <Users aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

function Votes({ count, label }: { count: number; label?: string }) {
  return (
    <span
      className="type-mono inline-flex h-6 items-center gap-1 rounded-pill bg-surface-3 px-2 text-[12px] text-fg-muted"
      aria-label={label ? `${count} ${label}` : undefined}
    >
      <ThumbsUp aria-hidden="true" className="size-3" />
      {count}
    </span>
  );
}

export function QueueItem({
  request,
  variant = "guest",
  position,
  statusLabel,
  mineLabel,
  dedicationText,
  ago,
  votesLabel,
  actions,
  handle,
  highlighted,
  className,
}: QueueItemProps) {
  const seed = `${request.artist} ${request.title}`;
  const dedication = request.dedicatedTo ? (dedicationText ?? request.dedicatedTo) : null;

  if (variant === "tv") {
    return (
      <div
        role="listitem"
        className={cx(
          "flex items-center gap-6 rounded-xl bg-[color-mix(in_oklab,var(--jm-surface-2)_78%,transparent)] p-4 pr-8 hairline",
          highlighted && "bg-brand-soft shadow-[var(--jm-glow-brand)]",
          className,
        )}
      >
        <span className="type-mono-lg w-14 shrink-0 text-center text-[34px] text-fg-subtle">
          {position ?? 0}
        </span>
        <Cover src={request.artworkUrl} seed={seed} size={88} radius="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
            {request.title}
          </p>
          <p className="mt-1 truncate text-[21px] font-semibold text-fg-muted">{request.artist}</p>
        </div>
        {dedication ? <DedicationChip text={dedication} large /> : null}
      </div>
    );
  }

  if (variant === "incoming") {
    return (
      <div
        role="listitem"
        className={cx(
          "group/incoming relative flex flex-col gap-3 rounded-lg bg-surface-2 p-3 hairline transition-colors hover:bg-surface-3",
          highlighted && "shadow-[inset_0_0_0_1px_var(--jm-brand),var(--jm-glow-soft)]",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <Cover src={request.artworkUrl} seed={seed} size={52} radius="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold leading-tight tracking-[-0.01em] text-fg">
              {request.title}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-fg-muted">{request.artist}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {request.tableLabel ? <TableChip label={request.tableLabel} /> : null}
              {request.votes > 1 ? <Votes count={request.votes} label={votesLabel} /> : null}
              {ago ? <span className="type-mono text-[11px] text-fg-subtle">{ago}</span> : null}
            </div>
          </div>
        </div>
        {dedication || request.note ? (
          <div className="flex flex-col gap-1.5">
            {dedication ? <DedicationChip text={dedication} /> : null}
            {request.note ? (
              <p className="flex items-start gap-1.5 text-[12.5px] italic leading-snug text-fg-muted">
                <MessageSquareQuote aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
                <span className="line-clamp-2">{request.note}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    );
  }

  if (variant === "dj") {
    return (
      <div
        role="listitem"
        className={cx(
          "group/dj flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2",
          highlighted && "bg-surface-2 shadow-[inset_2px_0_0_var(--jm-next)]",
          className,
        )}
      >
        {handle ? <span className="shrink-0 text-fg-subtle">{handle}</span> : null}
        <span className="type-mono w-5 shrink-0 text-center text-[12px] text-fg-subtle">{position}</span>
        <Cover src={request.artworkUrl} seed={seed} size={44} radius="sm" showMonogram={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight tracking-[-0.01em]">{request.title}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-fg-muted">
            <span className="truncate">{request.artist}</span>
            {request.tableLabel ? <TableChip label={request.tableLabel} /> : null}
          </div>
          {dedication ? (
            <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] font-semibold text-brand">
              <Gift aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{dedication}</span>
            </p>
          ) : null}
        </div>
        {request.votes > 1 ? <Votes count={request.votes} label={votesLabel} /> : null}
        {request.durationSec ? (
          <span className="type-mono shrink-0 text-[12px] text-fg-subtle">
            {formatDuration(request.durationSec)}
          </span>
        ) : null}
        {actions ? (
          <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover/dj:opacity-100">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="listitem"
      className={cx(
        "relative flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
        request.mine && "bg-brand-soft",
        highlighted && "bg-surface-2",
        className,
      )}
    >
      {request.mine ? (
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-pill bg-brand-gradient" />
      ) : null}
      <span className="type-mono w-5 shrink-0 text-center text-[12px] text-fg-subtle">{position}</span>
      <Cover src={request.artworkUrl} seed={seed} size={48} radius="sm" showMonogram={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold leading-tight tracking-[-0.01em]">{request.title}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-fg-muted">{request.artist}</p>
        {dedication ? (
          <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] font-semibold text-brand">
            <Gift aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{dedication}</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {request.mine && mineLabel ? (
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-brand">{mineLabel}</span>
        ) : null}
        <StatusPill status={request.status} label={statusLabel} size="sm" />
      </div>
      {actions}
    </div>
  );
}
