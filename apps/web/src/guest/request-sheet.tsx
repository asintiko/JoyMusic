"use client";

import { AlertCircle, Gift, Lock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { RequestItem, Track } from "@joymusic/shared";
import { Button, Cover, Input, Sheet, Textarea } from "@joymusic/ui";
import { useI18n } from "@/components/i18n";
import { artworkSrc } from "@/lib/art";
import { haptic } from "@/lib/haptics";
import {
  failureCopy,
  formatCountdown,
  mapRequestError,
  retryAfterOf,
  type RequestFailure,
} from "./request-errors";
import { useCountdown } from "./use-countdown";

export type RequestTarget =
  { mode: "track"; track: Track } | { mode: "text"; artist: string; title: string };

export interface RequestPayload {
  track?: Track;
  freeText?: { artist: string; title: string };
  note?: string;
  dedicatedTo?: string;
}

export interface RequestOutcome {
  request: RequestItem;
  merged: boolean;
}

export interface RequestSheetProps {
  target: RequestTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowNotes: boolean;
  submit: (payload: RequestPayload) => Promise<RequestOutcome>;
  onSuccess: (outcome: RequestOutcome) => void;
}

export function RequestSheet({
  target,
  open,
  onOpenChange,
  allowNotes,
  submit,
  onSuccess,
}: RequestSheetProps) {
  const { t } = useI18n();
  const formId = useId();
  const [dedicatedTo, setDedicatedTo] = useState("");
  const [note, setNote] = useState("");
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<RequestFailure | null>(null);
  const [failureId, setFailureId] = useState(0);
  const retryAfter = failure ? retryAfterOf(failure) : null;
  const remaining = useCountdown(retryAfter, failureId);
  const lastTarget = useRef<RequestTarget | null>(null);

  useEffect(() => {
    if (!open || target === lastTarget.current) return;
    lastTarget.current = target;
    setDedicatedTo("");
    setNote("");
    setFailure(null);
    setBusy(false);
    if (target?.mode === "text") {
      setArtist(target.artist);
      setTitle(target.title);
    } else {
      setArtist("");
      setTitle("");
    }
  }, [open, target]);

  useEffect(() => {
    if (!open) lastTarget.current = null;
  }, [open]);

  useEffect(() => {
    if (failure && retryAfter !== null && remaining === 0) setFailure(null);
  }, [failure, retryAfter, remaining]);

  const isText = target?.mode === "text";
  const blocked = failure?.kind === "closed" || failure?.kind === "no_session";
  const waiting = retryAfter !== null && remaining > 0;
  const textReady = artist.trim().length > 0 && title.trim().length > 0;
  const canSubmit = !busy && !blocked && !waiting && (!isText || textReady);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target || !canSubmit) return;
    setBusy(true);
    setFailure(null);
    const payload: RequestPayload = {
      note: allowNotes && note.trim() ? note.trim() : undefined,
      dedicatedTo: allowNotes && dedicatedTo.trim() ? dedicatedTo.trim() : undefined,
    };
    if (target.mode === "track") payload.track = target.track;
    else payload.freeText = { artist: artist.trim(), title: title.trim() };
    try {
      const outcome = await submit(payload);
      haptic("success");
      onSuccess(outcome);
    } catch (error) {
      haptic("warning");
      setFailure(mapRequestError(error));
      setFailureId((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  const copy = failure ? failureCopy(failure, t) : null;
  const previewTrack = target?.mode === "track" ? target.track : null;
  const heading = isText ? t.freeTextTitle : t.requestSheetTitle;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={heading}
      description={isText ? t.freeTextText : undefined}
      closeLabel={t.close}
      footer={
        <Button
          type="submit"
          form={formId}
          size="xl"
          fullWidth
          loading={busy}
          disabled={!canSubmit}
          data-testid="request-submit"
        >
          {busy ? t.sending : waiting ? t.retryIn(formatCountdown(remaining)) : t.submitRequest}
        </Button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2" noValidate>
        {previewTrack ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 hairline">
            <Cover
              src={artworkSrc(previewTrack.artworkUrl, 120)}
              seed={`${previewTrack.artist} ${previewTrack.title}`}
              size={56}
              radius="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="type-eyebrow text-fg-subtle">{t.requestSheetTrack}</p>
              <p className="truncate text-[16px] font-bold leading-tight">{previewTrack.title}</p>
              <p className="truncate text-[13.5px] text-fg-muted">{previewTrack.artist}</p>
            </div>
          </div>
        ) : null}

        {isText ? (
          <>
            <Input
              label={t.freeArtist}
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              placeholder={t.freeArtistPlaceholder}
              maxLength={120}
              size="lg"
              autoComplete="off"
              name="artist"
            />
            <Input
              label={t.freeTitle}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.freeTitlePlaceholder}
              maxLength={160}
              size="lg"
              autoComplete="off"
              name="title"
            />
          </>
        ) : null}

        {allowNotes ? (
          <>
            <Input
              label={
                <span>
                  {t.dedicationLabel}{" "}
                  <span className="font-medium text-fg-subtle">· {t.optional}</span>
                </span>
              }
              hint={t.dedicationHelp}
              value={dedicatedTo}
              onChange={(event) => setDedicatedTo(event.target.value)}
              placeholder={t.dedicationPlaceholder}
              maxLength={60}
              size="lg"
              autoComplete="off"
              name="dedicatedTo"
              leading={<Gift aria-hidden="true" className="size-4" />}
              invalid={failure?.kind === "blocked" && failure.field === "dedicatedTo"}
            />
            <Textarea
              label={
                <span>
                  {t.noteLabel} <span className="font-medium text-fg-subtle">· {t.optional}</span>
                </span>
              }
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t.notePlaceholder}
              maxLength={200}
              rows={2}
              showCount
              name="note"
              invalid={failure?.kind === "blocked" && failure.field === "note"}
            />
          </>
        ) : null}

        {copy ? (
          <div
            role="alert"
            data-testid="request-failure"
            data-failure={failure?.kind}
            className="flex items-start gap-3 rounded-lg bg-danger-soft p-3.5 text-danger-fg"
          >
            {blocked ? (
              <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            ) : (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[14.5px] font-extrabold leading-snug">{copy.title}</p>
              <p className="mt-0.5 text-[13.5px] font-medium leading-snug opacity-90">
                {copy.text}
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
