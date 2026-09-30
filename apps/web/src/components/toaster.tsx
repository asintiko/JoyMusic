"use client";

import { AlertTriangle, CheckCircle2, Music2, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";

export type ToastTone = "neutral" | "success" | "danger" | "playing" | "next";

export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: string;
  tone: ToastTone;
}

type Action = { type: "add"; toast: ToastItem } | { type: "remove"; id: string };

export function toastReducer(state: ToastItem[], action: Action): ToastItem[] {
  if (action.type === "remove") return state.filter((item) => item.id !== action.id);
  return [...state.filter((item) => item.id !== action.toast.id), action.toast].slice(-3);
}

interface ToastApi {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside Toaster");
  return value;
}

const toneIcon: Record<ToastTone, ReactNode> = {
  neutral: <Music2 aria-hidden="true" />,
  success: <CheckCircle2 aria-hidden="true" />,
  danger: <XCircle aria-hidden="true" />,
  playing: <Music2 aria-hidden="true" />,
  next: <AlertTriangle aria-hidden="true" />,
};

const toneClass: Record<ToastTone, string> = {
  neutral: "bg-surface-4 text-brand",
  success: "bg-success-soft text-success-fg",
  danger: "bg-danger-soft text-danger-fg",
  playing: "bg-playing-soft text-playing-fg",
  next: "bg-next-soft text-next-fg",
};

let counter = 0;

export function Toaster({ dismissLabel, children }: { dismissLabel: string; children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismiss = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const toast = useCallback((input: ToastInput) => {
    counter += 1;
    const id = input.id ?? `toast-${counter}`;
    dispatch({ type: "add", toast: { ...input, id, tone: input.tone ?? "neutral" } });
    return id;
  }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        data-testid="toast-viewport"
        className="pointer-events-none fixed inset-x-0 top-0 z-toast flex flex-col items-center gap-2 px-4 pt-[max(1rem,var(--jm-safe-top))]"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} dismissLabel={dismissLabel} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  dismissLabel,
  onDismiss,
}: {
  item: ToastItem;
  dismissLabel: string;
  onDismiss: (id: string) => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const duration = item.duration ?? (item.tone === "danger" ? 6500 : 4200);

  useEffect(() => {
    timer.current = window.setTimeout(() => onDismiss(item.id), duration);
    return () => window.clearTimeout(timer.current);
  }, [item, duration, onDismiss]);

  const urgent = item.tone === "danger";
  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      data-tone={item.tone}
      data-testid="toast"
      className="jm-rise pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-lg bg-surface-3 p-3 pr-2 text-fg shadow-3 hairline-strong"
    >
      <span
        className={cx(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]",
          toneClass[item.tone],
        )}
      >
        {toneIcon[item.tone]}
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="type-label text-[14px] text-fg">{item.title}</p>
        {item.description ? (
          <p className="type-body-sm mt-0.5 text-fg-muted">{item.description}</p>
        ) : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="focus-ring type-label mt-2 rounded-xs text-brand underline-offset-4 hover:underline"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={() => onDismiss(item.id)}
        className="focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-4 hover:text-fg"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
