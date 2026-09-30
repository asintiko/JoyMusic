import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@joymusic/ui";

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;
export const MenuRadioGroup = Dropdown.RadioGroup;

export function MenuContent({
  className,
  align = "start",
  sideOffset = 6,
  ...rest
}: ComponentProps<typeof Dropdown.Content>) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cx(
          "jm-menu z-popover min-w-[220px] max-w-[320px] rounded-md bg-surface-3 p-1.5 text-fg shadow-[var(--jm-shadow-3)] hairline-strong",
          className,
        )}
        {...rest}
      />
    </Dropdown.Portal>
  );
}

const itemClasses =
  "relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13.5px] font-semibold text-fg-muted outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-4 data-[highlighted]:text-fg [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-fg-subtle";

export function MenuItem({
  className,
  tone,
  ...rest
}: ComponentProps<typeof Dropdown.Item> & { tone?: "danger" }) {
  return (
    <Dropdown.Item
      className={cx(
        itemClasses,
        tone === "danger" &&
          "text-danger-fg data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger-fg [&>svg]:text-danger-fg",
        className,
      )}
      {...rest}
    />
  );
}

export function MenuRadioItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof Dropdown.RadioItem> & { children: ReactNode }) {
  return (
    <Dropdown.RadioItem
      className={cx(itemClasses, "pr-8 data-[state=checked]:text-fg", className)}
      {...rest}
    >
      {children}
      <Dropdown.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check aria-hidden="true" className="size-4 !text-brand" />
      </Dropdown.ItemIndicator>
    </Dropdown.RadioItem>
  );
}

export function MenuLabel({ className, ...rest }: ComponentProps<typeof Dropdown.Label>) {
  return (
    <Dropdown.Label
      className={cx("type-eyebrow px-2.5 pb-1 pt-1.5 text-fg-subtle", className)}
      {...rest}
    />
  );
}

export function MenuSeparator({ className, ...rest }: ComponentProps<typeof Dropdown.Separator>) {
  return (
    <Dropdown.Separator className={cx("my-1 h-px bg-[var(--jm-line)]", className)} {...rest} />
  );
}
