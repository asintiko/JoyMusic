import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export type SortDirection = "asc" | "desc" | null;

export function Table({
  className,
  containerClassName,
  ...rest
}: ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div className={cx("w-full overflow-x-auto rounded-lg bg-surface-1 hairline", containerClassName)}>
      <table
        className={cx("w-full border-collapse text-left font-sans text-[13px] text-fg", className)}
        {...rest}
      />
    </div>
  );
}

export function TableHead({ className, ...rest }: ComponentProps<"thead">) {
  return <thead className={cx("bg-surface-2", className)} {...rest} />;
}

export function TableBody({ className, ...rest }: ComponentProps<"tbody">) {
  return <tbody className={cx("[&>tr:last-child>td]:border-b-0", className)} {...rest} />;
}

export function TableRow({
  className,
  selected,
  interactive,
  ...rest
}: ComponentProps<"tr"> & { selected?: boolean; interactive?: boolean }) {
  return (
    <tr
      aria-selected={selected}
      className={cx(
        "transition-colors duration-100",
        (interactive ?? true) && "hover:bg-surface-2",
        selected && "bg-brand-soft hover:bg-brand-soft",
        className,
      )}
      {...rest}
    />
  );
}

export interface TableHeaderCellProps extends Omit<ComponentProps<"th">, "onClick"> {
  sortable?: boolean;
  direction?: SortDirection;
  onSort?: () => void;
  numeric?: boolean;
  sortLabel?: string;
}

export function TableHeaderCell({
  sortable,
  direction = null,
  onSort,
  numeric,
  sortLabel,
  className,
  children,
  ...rest
}: TableHeaderCellProps) {
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const SortIcon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      aria-sort={sortable ? ariaSort : undefined}
      className={cx(
        "h-9 whitespace-nowrap border-b border-line px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-fg-subtle",
        numeric && "text-right",
        className,
      )}
      {...rest}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={sortLabel}
          className={cx(
            "focus-ring -mx-1.5 inline-flex h-7 items-center gap-1.5 rounded-xs px-1.5 uppercase tracking-[0.08em] transition-colors hover:text-fg",
            direction && "text-fg",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <SortIcon aria-hidden="true" className={cx("size-3", !direction && "opacity-50")} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TableCell({
  numeric,
  mono,
  muted,
  className,
  ...rest
}: ComponentProps<"td"> & { numeric?: boolean; mono?: boolean; muted?: boolean }) {
  return (
    <td
      className={cx(
        "h-11 border-b border-line px-3 align-middle",
        numeric && "text-right tabular-nums",
        mono && "type-mono",
        muted && "text-fg-muted",
        className,
      )}
      {...rest}
    />
  );
}

export function TableCaption({ children, className }: { children: ReactNode; className?: string }) {
  return <caption className={cx("sr-only", className)}>{children}</caption>;
}
