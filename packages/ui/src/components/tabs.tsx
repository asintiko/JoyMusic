import * as RadixTabs from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { createContext, useContext, useId, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { cx } from "../lib/cx";
import { motionSprings } from "../lib/motion";

export type TabsVariant = "underline" | "segmented";

interface TabsContextValue {
  value: string;
  variant: TabsVariant;
  groupId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs parts must be rendered inside <Tabs>");
  return context;
}

export interface TabsProps extends Omit<
  ComponentProps<typeof RadixTabs.Root>,
  "value" | "defaultValue" | "onValueChange"
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  children: ReactNode;
}

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  variant = "underline",
  children,
  ...rest
}: TabsProps) {
  const groupId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  return (
    <TabsContext.Provider value={{ value: current, variant, groupId }}>
      <RadixTabs.Root
        value={current}
        onValueChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
        {...rest}
      >
        {children}
      </RadixTabs.Root>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...rest }: ComponentProps<typeof RadixTabs.List>) {
  const { variant } = useTabsContext();
  return (
    <RadixTabs.List
      className={cx(
        "flex items-center",
        variant === "underline"
          ? "gap-1 border-b border-line"
          : "w-fit gap-0.5 rounded-pill bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--jm-line)]",
        className,
      )}
      {...rest}
    />
  );
}

export interface TabsTriggerProps extends ComponentProps<typeof RadixTabs.Trigger> {
  count?: number;
}

export function TabsTrigger({ value, className, children, count, ...rest }: TabsTriggerProps) {
  const { value: active, variant, groupId } = useTabsContext();
  const reduced = usePrefersReducedMotion();
  const selected = active === value;
  return (
    <RadixTabs.Trigger
      value={value}
      className={cx(
        "focus-ring relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-sans font-bold transition-colors duration-150",
        variant === "underline"
          ? "h-11 rounded-t-sm px-3.5 text-[14px]"
          : "h-8 rounded-pill px-4 text-[13px]",
        selected ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
        className,
      )}
      {...rest}
    >
      {selected ? (
        <motion.span
          layoutId={`${groupId}-indicator`}
          aria-hidden="true"
          transition={reduced ? { duration: 0 } : motionSprings.snappy}
          className={cx(
            "absolute",
            variant === "underline"
              ? "inset-x-2 -bottom-px h-0.5 rounded-pill bg-brand-gradient"
              : "inset-0 rounded-pill bg-surface-4 shadow-[inset_0_1px_0_var(--jm-highlight),var(--jm-shadow-1)]",
          )}
        />
      ) : null}
      <span className="relative inline-flex items-center gap-2">
        {children}
        {count !== undefined ? (
          <span
            className={cx(
              "type-mono rounded-pill px-1.5 py-0.5 text-[10px]",
              selected ? "bg-brand-soft text-brand" : "bg-surface-3 text-fg-subtle",
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
    </RadixTabs.Trigger>
  );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cx("focus-ring outline-none data-[state=active]:animate-fade-in", className)}
      {...rest}
    />
  );
}
