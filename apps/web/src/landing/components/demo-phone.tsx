"use client";

import { Gift, Plus, Search, Check, RotateCcw, ChevronLeft } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useReducer } from "react";
import { Equalizer, GenerativeCover, Logo, cx } from "@joymusic/ui";
import { fill } from "../copy";
import { demoTracks, findDemoTrack, tickerTracks } from "../demo-data";
import {
  demoAutoAdvanceMs,
  demoInitialState,
  demoReducer,
  demoStepNumber,
  demoStepOrder,
} from "../demo-machine";
import type { DemoStep } from "../demo-machine";
import type { DemoCopy } from "../types";

function Status({ step }: { step: DemoStep }) {
  const level = step === "sent" ? 1 : step === "accepted" ? 2 : 3;
  return (
    <div className="lp-status-timeline" aria-hidden="true">
      {[1, 2, 3].map((index) => (
        <span key={index} data-on={index <= level} />
      ))}
    </div>
  );
}

export default function DemoPhone({ copy }: { copy: DemoCopy }) {
  const [state, dispatch] = useReducer(demoReducer, demoInitialState);
  const reduced = useReducedMotion();
  const picked = findDemoTrack(state.trackId);
  const current = tickerTracks[0];

  useEffect(() => {
    const delay = demoAutoAdvanceMs[state.step];
    if (delay === undefined) return;
    const timer = window.setTimeout(() => dispatch({ type: "advance" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.step]);

  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };
  const stepNumber = demoStepNumber(state.step);
  const hint = copy.hints[state.step];

  const screen = (() => {
    switch (state.step) {
      case "idle":
        return (
          <div className="flex h-full flex-col">
            <div className="flex flex-col items-center px-4 pt-3 text-center">
              <div className="size-[8.5rem] overflow-hidden rounded-[1.1rem] shadow-[var(--jm-shadow-3)]">
                <GenerativeCover seed="velvet-circuit" className="size-full" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-playing-fg">
                <Equalizer bars={4} height={12} barWidth={3} gap={2} color="var(--jm-playing)" />
                {copy.nowPlaying}
              </div>
              <p className="m-0 mt-1.5 font-display text-[17px] font-semibold tracking-[-0.02em]">
                {current?.title}
              </p>
              <p className="m-0 text-[13px] text-fg-muted">{current?.artist}</p>
            </div>
            <div className="mt-4 px-4">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
                {copy.upNext}
              </p>
              {tickerTracks.slice(1, 3).map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 border-b border-white/[0.06] py-2.5"
                >
                  <span className="w-3 tabular-nums text-[11px] text-fg-subtle">{index + 1}</span>
                  <div className="size-9 shrink-0 overflow-hidden rounded-lg">
                    <GenerativeCover seed={track.id} className="size-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[13px] font-bold">{track.title}</p>
                    <p className="m-0 truncate text-[12px] text-fg-muted">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto p-3">
              <button
                type="button"
                onClick={() => dispatch({ type: "open" })}
                className="lp-tap-hint flex h-12 w-full items-center gap-2.5 rounded-full bg-surface-3 px-4 text-left text-[13px] font-semibold text-fg-muted"
                style={{ boxShadow: "inset 0 0 0 1px var(--jm-line-strong)" }}
              >
                <Search size={17} aria-hidden="true" />
                {copy.searchPlaceholder}
              </button>
            </div>
          </div>
        );
      case "results":
        return (
          <div className="flex h-full flex-col p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={copy.back}
                onClick={() => dispatch({ type: "back" })}
                className="inline-flex size-9 items-center justify-center rounded-full bg-surface-3"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <div
                className="flex h-10 flex-1 items-center gap-2 rounded-full bg-surface-3 px-3.5 text-[14px] font-semibold"
                style={{ boxShadow: "inset 0 0 0 1px var(--jm-focus)" }}
              >
                <Search size={16} aria-hidden="true" className="text-fg-muted" />
                {copy.query}
                <span className="lp-caret" aria-hidden="true" />
              </div>
            </div>
            <p className="m-0 mb-1 mt-4 px-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
              {copy.results}
            </p>
            {demoTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 border-b border-white/[0.06] px-1 py-2.5"
              >
                <div className="size-11 shrink-0 overflow-hidden rounded-xl">
                  <GenerativeCover seed={track.id} className="size-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[14px] font-bold">{track.title}</p>
                  <p className="m-0 truncate text-[12px] text-fg-muted">
                    {track.artist} · {track.duration}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${copy.request}: ${track.title}`}
                  onClick={() => dispatch({ type: "pick", trackId: track.id })}
                  className={cx(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient-strong text-on-brand",
                    index === 0 && "lp-tap-hint",
                  )}
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        );
      case "compose":
        return (
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <p className="m-0 font-display text-[15px] font-semibold tracking-[-0.02em]">
                {copy.sheetTitle}
              </p>
              <button
                type="button"
                aria-label={copy.back}
                onClick={() => dispatch({ type: "back" })}
                className="inline-flex size-9 items-center justify-center rounded-full bg-surface-3"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl">
                <GenerativeCover seed={picked?.id ?? "x"} className="size-full" />
              </div>
              <div className="min-w-0">
                <p className="m-0 truncate text-[15px] font-bold">{picked?.title}</p>
                <p className="m-0 truncate text-[13px] text-fg-muted">{picked?.artist}</p>
              </div>
            </div>
            <button
              type="button"
              aria-pressed={state.dedication}
              onClick={() => dispatch({ type: "toggleDedication" })}
              className={cx(
                "mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl px-3.5 text-left",
                state.dedication ? "bg-brand-soft" : "bg-surface-2 lp-tap-hint",
              )}
              style={{
                boxShadow: state.dedication
                  ? "inset 0 0 0 1px var(--jm-brand)"
                  : "inset 0 0 0 1px var(--jm-line-strong)",
              }}
            >
              <Gift size={18} aria-hidden="true" className="shrink-0 text-brand" />
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-fg-subtle">
                  {copy.dedicationLabel}
                </span>
                <span className="block text-[13px] font-semibold">
                  {state.dedication ? copy.dedicationValue : "+"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "send" })}
              className={cx(
                "mt-auto inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-gradient-strong text-[14px] font-extrabold text-on-brand",
                state.dedication && "lp-tap-hint",
              )}
            >
              {copy.send}
            </button>
          </div>
        );
      default: {
        const playing = state.step === "playing";
        return (
          <div className="flex h-full flex-col items-center px-4 pt-6 text-center">
            <div
              className={cx(
                "flex size-14 items-center justify-center rounded-full",
                playing ? "bg-playing-soft text-playing-fg" : "bg-brand-soft text-brand",
              )}
            >
              {playing ? (
                <Equalizer bars={4} height={20} barWidth={4} gap={3} color="var(--jm-playing)" />
              ) : (
                <Check size={26} aria-hidden="true" />
              )}
            </div>
            <p className="m-0 mt-4 font-display text-[18px] font-semibold tracking-[-0.02em]">
              {state.step === "sent"
                ? copy.sentTitle
                : state.step === "accepted"
                  ? copy.acceptedTitle
                  : copy.playingTitle}
            </p>
            <p className="m-0 mt-1 text-[13px] text-fg-muted">
              {state.step === "sent"
                ? copy.sentText
                : state.step === "accepted"
                  ? copy.acceptedText
                  : copy.playingText}
            </p>
            <div className="mt-5 w-full rounded-2xl bg-surface-2 p-3 text-left">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-xl">
                  <GenerativeCover seed={picked?.id ?? "x"} className="size-full" />
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-[14px] font-bold">{picked?.title}</p>
                  <p className="m-0 truncate text-[12px] text-fg-muted">{picked?.artist}</p>
                </div>
              </div>
              {state.dedication ? (
                <p className="m-0 mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-brand">
                  <Gift size={13} aria-hidden="true" />
                  {copy.dedicationValue}
                </p>
              ) : null}
              <div className="mt-3">
                <Status step={state.step} />
              </div>
            </div>
            {playing ? (
              <button
                type="button"
                onClick={() => dispatch({ type: "reset" })}
                className="lp-tap-hint mt-auto mb-4 inline-flex h-11 items-center gap-2 rounded-full bg-surface-3 px-5 text-[13px] font-bold"
              >
                <RotateCcw size={15} aria-hidden="true" />
                {copy.restart}
              </button>
            ) : null}
          </div>
        );
      }
    }
  })();

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col items-center gap-5">
        <div className="lp-mini-phone w-[17.5rem]" data-theme="club">
          <div className="lp-mini-screen h-[34.5rem]">
            <div className="lp-mini-glow" aria-hidden="true" />
            <div className="relative z-[1] flex h-full flex-col">
              <div className="flex items-center gap-2 px-4 pb-1 pt-4">
                <Logo variant="mark" tone="brand" height={22} decorative />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13px] font-extrabold leading-tight">
                    {copy.venue}
                  </p>
                </div>
                <span className="lp-live-dot" aria-hidden="true" />
              </div>
              <div className="relative min-h-0 flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={
                      state.step === "idle" || state.step === "results" || state.step === "compose"
                        ? state.step
                        : "status"
                    }
                    className="absolute inset-0"
                    initial={{ opacity: 0, y: reduced ? 0 : 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -10 }}
                    transition={transition}
                  >
                    {screen}
                  </m.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex min-h-[3.25rem] flex-col items-center gap-2 text-center"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {demoStepOrder.map((step) => (
              <span
                key={step}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: step === state.step ? 22 : 7,
                  background:
                    demoStepNumber(step) <= stepNumber
                      ? "var(--jm-brand)"
                      : "var(--jm-line-strong)",
                }}
              />
            ))}
          </div>
          <p className="m-0 text-[13px] font-bold text-fg">
            <span className="text-fg-subtle">
              {fill(copy.stepOf, { n: stepNumber, total: demoStepOrder.length })}
            </span>
            {" · "}
            {hint}
          </p>
        </div>
      </div>
    </LazyMotion>
  );
}
