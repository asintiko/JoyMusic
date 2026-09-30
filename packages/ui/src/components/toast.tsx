import { AlertTriangle, CheckCircle2, Info, Music2, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
import { createPortal } from "react-dom";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { cx } from "../lib/cx";
import { motionSprings } from "../lib/motion";

export type ToastTone = "neutral" | "success" | "danger" | "info" | "playing" | "next";

export interface ToastInput {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  duration?: number;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export interface ToastItem extends ToastInput {
  id: string;
  tone: ToastTone;
}

type ToastAction = { type: "add"; toast: ToastItem } | { type: "remove"; id: string };

export function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case "add":
      return [...state.filter((item) => item.id !== action.toast.id), action.toast].slice(-4);
    case "remove":
      return state.filter((item) => item.id !== action.id);
  }
}

export interface ToastApi {
  toast: (input: ToastInput) => string;
  dismiss: (id?: string) => void;
  success: (title: ReactNode, description?: ReactNode) => string;
  error: (title: ReactNode, description?: ReactNode) => string;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <Toaster>");
  return context;
}

const toneIcons: Record<ToastTone, ReactNode> = {
  neutral: <Music2 aria-hidden="true" />,
  success: <CheckCircle2 aria-hidden="true" />,
  danger: <XCircle aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
  playing: <Music2 aria-hidden="true" />,
  next: <AlertTriangle aria-hidden="true" />,
};

const toneClasses: Record<ToastTone, string> = {
  neutral: "bg-surface-4 text-brand",
  success: "bg-success-soft text-success-fg",
  danger: "bg-danger-soft text-danger-fg",
  info: "bg-info-soft text-info-fg",
  playing: "bg-playing-soft text-playing-fg",
  next: "bg-next-soft text-next-fg",
};

export interface ToasterProps {
  children?: ReactNode;
  position?: "top" | "bottom";
  dismissLabel?: string;
  defaultDuration?: number;
}

let counter = 0;

export function Toaster({
  children,
  position = "bottom",
  dismissLabel = "Dismiss",
  defaultDuration = 4200,
}: ToasterProps) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const reduced = usePrefersReducedMotion();

  const dismiss = useCallback((id?: string) => {
    if (id) dispatch({ type: "remove", id });
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      counter += 1;
      const id = input.id ?? `toast-${counter}`;
      dispatch({ type: "add", toast: { ...input, id, tone: input.tone ?? "neutral" } });
      return id;
    },
    [dispatch],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, tone: "success" }),
      error: (title, description) => toast({ title, description, tone: "danger", duration: 6500 }),
    }),
    [toast, dismiss],
  );

  const viewport =
    typeof document === "undefined"
      ? null
      : createPortal(
          <div
            data-testid="toast-viewport"
            className={cx(
              "pointer-events-none fixed inset-x-0 z-toast flex flex-col items-center gap-2 px-4",
              position === "bottom" ? "bottom-0 pb-[max(1rem,var(--jm-safe-bottom))]" : "top-0 pt-[max(1rem,var(--jm-safe-top))]",
            )}
          >
            <AnimatePresence initial={false}>
              {toasts.map((item) => (
                <ToastCard
                  key={item.id}
                  item={item}
                  position={position}
                  reduced={reduced}
                  dismissLabel={dismissLabel}
                  duration={item.duration ?? defaultDuration}
                  onDismiss={() => dismiss(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body,
        );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {viewport}
    </ToastContext.Provider>
  );
}

export const ToastProvider = Toaster;

interface ToastCardProps {
  item: ToastItem;
  position: "top" | "bottom";
  reduced: boolean;
  dismissLabel: string;
  duration: number;
  onDismiss: () => void;
}

function ToastCard({ item, position, reduced, dismissLabel, duration, onDismiss }: ToastCardProps) {
  const timer = useRef<number | undefined>(undefined);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  const start = useCallback(() => {
    if (duration <= 0) return;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(onDismiss, remaining.current);
  }, [duration, onDismiss]);

  const pause = useCallback(() => {
    window.clearTimeout(timer.current);
    remaining.current = Math.max(600, remaining.current - (Date.now() - startedAt.current));
  }, []);

  useEffect(() => {
    remaining.current = duration;
    start();
    return () => window.clearTimeout(timer.current);
  }, [duration, start]);

  const offset = position === "bottom" ? 24 : -24;
  const urgent = item.tone === "danger";

  return (
    <motion.div
      layout={!reduced}
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-atomic="true"
      data-tone={item.tone}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: offset, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
      transition={reduced ? { duration: 0 } : motionSprings.snappy}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_event, info) => {
        if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500) onDismiss();
      }}
      onPointerEnter={pause}
      onPointerLeave={start}
      onFocusCapture={pause}
      onBlurCapture={start}
      className="jm-glass pointer-events-auto flex w-full max-w-[420px] touch-pan-y items-start gap-3 rounded-lg p-3 pr-2 text-fg shadow-3"
    >
      <span
        className={cx(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-[18px]",
          toneClasses[item.tone],
        )}
      >
        {item.icon ?? toneIcons[item.tone]}
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
              onDismiss();
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
        onClick={onDismiss}
        className="focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-4 hover:text-fg"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </motion.div>
  );
}
