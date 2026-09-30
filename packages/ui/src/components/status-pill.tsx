import { AudioLines, Check, Hourglass, ListMusic, TimerOff, X } from "lucide-react";
import type { RequestStatus } from "@joymusic/shared";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface StatusPillProps extends Omit<ComponentProps<"span">, "children"> {
  status: RequestStatus;
  label?: string;
  size?: "sm" | "md" | "lg";
  hideIcon?: boolean;
}

export const defaultStatusLabels: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Queued",
  playing: "Playing now",
  played: "Played",
  declined: "Declined",
  expired: "Expired",
};

const statusStyles: Record<RequestStatus, { pill: string; dot: string; icon: ReactNode }> = {
  pending: {
    pill: "bg-brand-soft text-brand",
    dot: "bg-brand",
    icon: <Hourglass aria-hidden="true" />,
  },
  accepted: {
    pill: "bg-next-soft text-next-fg",
    dot: "bg-next",
    icon: <ListMusic aria-hidden="true" />,
  },
  playing: {
    pill: "bg-playing-soft text-playing-fg",
    dot: "bg-playing",
    icon: <AudioLines aria-hidden="true" />,
  },
  played: {
    pill: "bg-surface-3 text-fg-muted",
    dot: "bg-fg-subtle",
    icon: <Check aria-hidden="true" />,
  },
  declined: {
    pill: "bg-danger-soft text-danger-fg",
    dot: "bg-danger",
    icon: <X aria-hidden="true" />,
  },
  expired: {
    pill: "bg-surface-2 text-fg-subtle",
    dot: "bg-fg-disabled",
    icon: <TimerOff aria-hidden="true" />,
  },
};

const sizeClasses = {
  sm: "h-5 gap-1 px-2 text-[11px] [&_svg]:size-3",
  md: "h-6 gap-1.5 px-2.5 text-[12px] [&_svg]:size-3.5",
  lg: "h-8 gap-2 px-3.5 text-[13px] [&_svg]:size-4",
} as const;

export function StatusPill({ status, label, size = "md", hideIcon, className, ...rest }: StatusPillProps) {
  const style = statusStyles[status];
  return (
    <span
      data-status={status}
      className={cx(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-pill font-sans font-bold",
        sizeClasses[size],
        style.pill,
        className,
      )}
      {...rest}
    >
      {hideIcon ? null : status === "playing" ? (
        <span className={cx("jm-pulse-dot size-1.5 rounded-full", style.dot)} aria-hidden="true" />
      ) : (
        style.icon
      )}
      {label ?? defaultStatusLabels[status]}
    </span>
  );
}
