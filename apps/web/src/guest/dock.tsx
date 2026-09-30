"use client";

import { Hourglass, Keyboard, ListMusic, Lock, Search } from "lucide-react";
import { IconButton, cx } from "@joymusic/ui";
import { useI18n } from "@/components/i18n";

export interface DockProps {
  mode: "open" | "closed" | "waiting";
  activeCount: number;
  onSearch: () => void;
  onSearchIntent: () => void;
  onText: () => void;
  onMine: () => void;
  allowFreeText: boolean;
}

export function Dock({
  mode,
  activeCount,
  onSearch,
  onSearchIntent,
  onText,
  onMine,
  allowFreeText,
}: DockProps) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="dock-fade h-8" aria-hidden="true" />
      <div className="pointer-events-auto bg-canvas pb-[calc(var(--jm-safe-bottom)+12px)] pt-1">
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-2 px-4">
          {mode === "open" ? (
            <button
              type="button"
              data-testid="open-search"
              onClick={onSearch}
              onPointerEnter={onSearchIntent}
              onFocus={onSearchIntent}
              onTouchStart={onSearchIntent}
              aria-label={t.searchPlaceholder}
              className="focus-ring flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-pill bg-surface-2 pl-4 pr-3 text-left shadow-[inset_0_0_0_1px_var(--jm-line)] transition-colors hover:bg-surface-3"
            >
              <Search aria-hidden="true" className="size-5 shrink-0 text-fg-subtle" />
              <span className="truncate text-[16px] font-medium text-fg-subtle">
                {t.dockSearch}
              </span>
            </button>
          ) : (
            <div
              data-testid="dock-closed"
              role="status"
              className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-pill bg-surface-2 px-4 shadow-[inset_0_0_0_1px_var(--jm-line)]"
            >
              {mode === "closed" ? (
                <Lock aria-hidden="true" className="size-[18px] shrink-0 text-next-fg" />
              ) : (
                <Hourglass aria-hidden="true" className="size-[18px] shrink-0 text-brand" />
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13.5px] font-extrabold text-fg">
                  {mode === "closed" ? t.bannerClosedTitle : t.noSessionTitle}
                </p>
                <p className="truncate text-[12px] font-medium text-fg-muted">
                  {mode === "closed" ? t.bannerClosedText : t.dockWaitingText}
                </p>
              </div>
            </div>
          )}
          <div className="relative shrink-0">
            <IconButton
              label={t.myRequests}
              icon={<ListMusic aria-hidden="true" className="size-5" />}
              variant="secondary"
              size="lg"
              className="!size-12 !rounded-full"
              onClick={onMine}
              data-testid="open-mine"
            />
            {activeCount > 0 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "type-mono pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gradient-strong px-1 text-[10.5px] font-bold text-on-brand",
                )}
              >
                {activeCount}
              </span>
            ) : null}
          </div>
          {mode === "open" && allowFreeText ? (
            <IconButton
              label={t.requestByText}
              icon={<Keyboard aria-hidden="true" className="size-5" />}
              variant="primary"
              size="lg"
              className="!size-12 !rounded-full"
              onClick={onText}
              data-testid="open-text"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
