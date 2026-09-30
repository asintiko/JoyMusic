"use client";

import { ThumbsUp } from "lucide-react";
import type { RequestItem } from "@joymusic/shared";
import { requestStatusLabels } from "@joymusic/shared";
import { EmptyState, Sheet, StatusPill, cx } from "@joymusic/ui";
import { useI18n } from "@/components/i18n";
import { artworkSrc } from "@/lib/art";
import { LiteCover } from "./lite-cover";
import { sortedMine } from "./live-state";

export interface MyRequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mine: Record<string, RequestItem>;
  queueOrder: string[];
}

export function MyRequestsSheet({ open, onOpenChange, mine, queueOrder }: MyRequestsSheetProps) {
  const { t, locale } = useI18n();
  const items = sortedMine(mine);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.myRequests}
      closeLabel={t.close}
      className="min-h-[52dvh]"
    >
      {items.length === 0 ? (
        <EmptyState
          illustration="inbox"
          size="sm"
          title={t.myRequestsEmptyTitle}
          description={t.myRequestsEmptyText}
        />
      ) : (
        <ul className="flex flex-col gap-1 pb-3" data-testid="my-requests">
          {items.map((item) => {
            const position = item.status === "accepted" ? queueOrder.indexOf(item.id) + 1 : 0;
            const closed = item.status === "declined" || item.status === "expired";
            return (
              <li
                key={item.id}
                data-testid="my-request"
                data-status={item.status}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-2 py-2.5",
                  item.status === "playing" && "bg-playing-soft",
                  closed && "opacity-70",
                )}
              >
                <LiteCover
                  src={artworkSrc(item.artworkUrl, 120)}
                  seed={`${item.artist} ${item.title}`}
                  size={52}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold leading-tight">{item.title}</p>
                  <p className="truncate text-[13px] text-fg-muted">{item.artist}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusPill
                      status={item.status}
                      label={requestStatusLabels[locale][item.status]}
                      size="sm"
                    />
                    {position > 0 ? (
                      <span className="type-mono text-[11.5px] text-fg-subtle">
                        {t.queuePosition(position)}
                      </span>
                    ) : null}
                    {item.votes > 1 ? (
                      <span className="type-mono inline-flex items-center gap-1 text-[11.5px] text-fg-subtle">
                        <ThumbsUp aria-hidden="true" className="size-3" />
                        {item.votes}
                      </span>
                    ) : null}
                  </div>
                  {item.dedicatedTo ? (
                    <p className="mt-1 truncate text-[12px] font-semibold text-brand">
                      {t.dedicationFor(item.dedicatedTo)}
                    </p>
                  ) : null}
                  {item.status === "declined" && item.declineReason ? (
                    <p className="mt-1 text-[12.5px] italic text-fg-muted">
                      {t.declinedReason}: {item.declineReason}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
