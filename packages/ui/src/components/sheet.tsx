import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import type { PanInfo } from "motion/react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { cx } from "../lib/cx";
import { motionSprings } from "../lib/motion";

export type SheetSide = "bottom" | "right";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  side?: SheetSide;
  closeLabel?: string;
  hideTitle?: boolean;
  dismissDistance?: number;
  dismissVelocity?: number;
  className?: string;
}

export function shouldDismissSheet(
  offset: number,
  velocity: number,
  distance = 120,
  minVelocity = 520,
): boolean {
  return offset > distance || velocity > minVelocity;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "bottom",
  closeLabel = "Close",
  hideTitle = false,
  dismissDistance = 120,
  dismissVelocity = 520,
  className,
}: SheetProps) {
  const reduced = usePrefersReducedMotion();
  const isBottom = side === "bottom";
  const controls = useDragControls();
  const startDrag = (event: ReactPointerEvent) => controls.start(event);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const offset = isBottom ? info.offset.y : info.offset.x;
    const velocity = isBottom ? info.velocity.y : info.velocity.x;
    if (shouldDismissSheet(offset, velocity, dismissDistance, dismissVelocity)) {
      onOpenChange(false);
    }
  };

  const hidden = isBottom ? { y: "100%" } : { x: "100%" };
  const shown = isBottom ? { y: 0 } : { x: 0 };

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                data-testid="sheet-overlay"
                className="fixed inset-0 z-overlay bg-scrim backdrop-blur-[4px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.24 }}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild forceMount>
              <motion.div
                data-side={side}
                className={cx(
                  "fixed z-overlay flex flex-col bg-surface-1 text-fg shadow-4 outline-none hairline-strong",
                  isBottom
                    ? "inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-[560px] rounded-t-2xl pb-safe"
                    : "inset-y-0 right-0 w-full max-w-[420px] rounded-l-2xl",
                  className,
                )}
                initial={reduced ? false : hidden}
                animate={shown}
                exit={reduced ? { opacity: 0 } : hidden}
                transition={reduced ? { duration: 0 } : motionSprings.sheet}
                drag={isBottom ? "y" : "x"}
                dragConstraints={isBottom ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
                dragElastic={isBottom ? { top: 0.04, bottom: 0.7 } : { left: 0.04, right: 0.7 }}
                dragMomentum={false}
                dragListener={false}
                dragControls={controls}
                onDragEnd={handleDragEnd}
              >
                <SheetDragHandle isBottom={isBottom} onStart={startDrag} />
                <div
                  className={cx("flex items-start gap-3 px-5 pb-2 pt-1", !isBottom && "pt-5")}
                  onPointerDown={startDrag}
                >
                  <div className="min-w-0 flex-1">
                    <RadixDialog.Title className={cx("type-title-md", hideTitle && "sr-only")}>
                      {title}
                    </RadixDialog.Title>
                    {description ? (
                      <RadixDialog.Description className="type-body-sm mt-1 text-fg-muted">
                        {description}
                      </RadixDialog.Description>
                    ) : null}
                  </div>
                  <RadixDialog.Close
                    aria-label={closeLabel}
                    className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-fg-muted transition-colors hover:bg-surface-4 hover:text-fg"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </RadixDialog.Close>
                </div>
                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
                  {children}
                </div>
                {footer ? (
                  <div className="flex flex-col gap-2 px-5 pb-5 pt-3">{footer}</div>
                ) : (
                  <div className="h-3" />
                )}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

function SheetDragHandle({
  isBottom,
  onStart,
}: {
  isBottom: boolean;
  onStart: (event: ReactPointerEvent) => void;
}) {
  if (!isBottom) return null;
  return (
    <div
      data-testid="sheet-handle"
      aria-hidden="true"
      onPointerDown={onStart}
      className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
    >
      <span className="h-1 w-10 rounded-pill bg-[color-mix(in_oklab,var(--jm-fg)_28%,transparent)]" />
    </div>
  );
}
