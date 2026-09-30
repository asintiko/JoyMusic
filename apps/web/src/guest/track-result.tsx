"use client";

import { Check, Pause, Play, Plus } from "lucide-react";
import type { RequestStatus, Track } from "@joymusic/shared";
import { requestStatusLabels } from "@joymusic/shared";
import { IconButton, Spinner, StatusPill, cx, formatDuration } from "@joymusic/ui";
import { useI18n } from "@/components/i18n";
import { artworkSrc } from "@/lib/art";
import { LiteCover } from "./lite-cover";
import type { PreviewState } from "./preview-player";

export interface TrackResultProps {
  track: Track;
  preview: PreviewState;
  requested: boolean;
  queueStatus: RequestStatus | null;
  disabled?: boolean;
  onRequest: (track: Track) => void;
  onPreview: (track: Track) => void;
}

export function TrackResult({
  track,
  preview,
  requested,
  queueStatus,
  disabled,
  onRequest,
  onPreview,
}: TrackResultProps) {
  const { t, locale } = useI18n();
  const active = preview.trackId === track.id && preview.status !== "idle";
  const loading = active && preview.status === "loading";
  const canPreview = Boolean(track.previewUrl);
  const seed = `${track.artist} ${track.title}`;

  return (
    <div
      role="listitem"
      data-testid="track-result"
      data-track-id={track.id}
      className={cx(
        "flex min-w-0 items-center gap-3 rounded-md px-2 py-2 transition-colors",
        active && "bg-brand-soft",
      )}
    >
      <div className="relative size-14 shrink-0">
        <LiteCover src={artworkSrc(track.artworkUrl, 120)} seed={seed} size={56} />
        {canPreview ? (
          <button
            type="button"
            onClick={() => onPreview(track)}
            aria-label={active ? t.previewPause(track.title) : t.previewPlay(track.title)}
            aria-pressed={active}
            className={cx(
              "focus-ring absolute inset-0 flex items-center justify-center rounded-sm text-white transition-colors",
              active ? "bg-[rgb(6_4_12/0.62)]" : "bg-transparent",
            )}
          >
            <span
              className={cx(
                "flex size-6 items-center justify-center rounded-full bg-[rgb(6_4_12/0.62)] backdrop-blur-sm",
                active ? "opacity-0" : "absolute bottom-1 right-1",
              )}
            >
              <Play aria-hidden="true" className="size-3 fill-current" />
            </span>
            {loading ? (
              <Spinner size={22} label="" />
            ) : active ? (
              <span className="relative flex size-9 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="rgb(255 255 255 / 0.25)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={100.5}
                    strokeDashoffset={100.5 * (1 - preview.progress)}
                  />
                </svg>
                <Pause aria-hidden="true" className="size-4 fill-current" />
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em] text-fg">
          {track.title}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13.5px] text-fg-muted">
          {track.explicit ? (
            <span
              title={t.explicit}
              aria-label={t.explicit}
              className="inline-flex size-[15px] shrink-0 items-center justify-center rounded-[4px] bg-fg-subtle text-[9px] font-extrabold leading-none text-canvas"
            >
              E
            </span>
          ) : null}
          <span className="truncate">{track.artist}</span>
        </p>
        {queueStatus ? (
          <StatusPill
            status={queueStatus}
            label={requestStatusLabels[locale][queueStatus]}
            size="sm"
            className="mt-1.5"
          />
        ) : null}
      </div>
      {track.durationSec ? (
        <span className="type-mono hidden shrink-0 text-[12px] text-fg-subtle min-[400px]:inline">
          {formatDuration(track.durationSec)}
        </span>
      ) : null}
      {requested ? (
        <IconButton
          label={t.requested}
          icon={<Check aria-hidden="true" className="size-5" />}
          variant="secondary"
          size="md"
          disabled
          className="!size-11 !rounded-full !bg-playing-soft !text-playing-fg !opacity-100"
        />
      ) : (
        <IconButton
          label={`${t.request}: ${track.title}`}
          icon={<Plus aria-hidden="true" className="size-5" />}
          variant="secondary"
          size="md"
          disabled={disabled}
          onClick={() => onRequest(track)}
          className="!size-11 !rounded-full"
        />
      )}
    </div>
  );
}
