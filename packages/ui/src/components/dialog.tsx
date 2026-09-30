import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { cx } from "../lib/cx";
import { motionSprings } from "../lib/motion";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  closeLabel?: string;
  hideTitle?: boolean;
  className?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
  hideTitle = false,
  className,
}: DialogProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-modal bg-scrim backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              />
            </RadixDialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-modal flex items-center justify-center p-4">
              <RadixDialog.Content asChild forceMount>
                <motion.div
                  className={cx(
                    "pointer-events-auto relative w-full overflow-hidden rounded-xl bg-surface-2 text-fg shadow-4 hairline-strong outline-none",
                    sizeClasses[size],
                    className,
                  )}
                  initial={reduced ? false : { opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                  transition={reduced ? { duration: 0 } : motionSprings.snappy}
                >
                  <div className="flex items-start gap-4 px-6 pb-2 pt-6">
                    <div className="min-w-0 flex-1">
                      <RadixDialog.Title
                        className={cx("type-title-md text-fg", hideTitle && "sr-only")}
                      >
                        {title}
                      </RadixDialog.Title>
                      {description ? (
                        <RadixDialog.Description className="type-body mt-1.5 text-fg-muted">
                          {description}
                        </RadixDialog.Description>
                      ) : null}
                    </div>
                    <RadixDialog.Close
                      aria-label={closeLabel}
                      className="focus-ring -mr-2 -mt-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
                    >
                      <X aria-hidden="true" className="size-[18px]" />
                    </RadixDialog.Close>
                  </div>
                  {children ? <div className="px-6 py-3">{children}</div> : null}
                  {footer ? (
                    <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-6 pt-4">
                      {footer}
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </motion.div>
              </RadixDialog.Content>
            </div>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
