import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  shortcut?: ReactNode;
  delayDuration?: number;
  className?: string;
}

export function TooltipProvider({
  children,
  delayDuration = 350,
}: {
  children: ReactNode;
  delayDuration?: number;
}) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={200}>
      {children}
    </RadixTooltip.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  shortcut,
  delayDuration = 350,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={8}
            collisionPadding={12}
            className={cx(
              "jm-tooltip z-tooltip flex max-w-[280px] items-center gap-2 rounded-sm bg-surface-5 px-2.5 py-1.5 text-[12px] font-semibold text-fg shadow-3 hairline-strong",
              className,
            )}
          >
            {content}
            {shortcut ? <span className="inline-flex items-center gap-1">{shortcut}</span> : null}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
