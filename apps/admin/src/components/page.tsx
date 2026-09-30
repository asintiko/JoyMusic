import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";
import { Link } from "@tanstack/react-router";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="focus-ring truncate rounded-xs text-fg-subtle transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cx("truncate", last ? "text-fg" : "text-fg-subtle")}
                >
                  {item.label}
                </span>
              )}
              {!last ? (
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-disabled" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
}

export function PageHeader({ title, description, actions, leading }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5">
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <h1 className="type-title-lg truncate">{title}</h1>
          {description ? (
            <p className="type-body-sm mt-1 max-w-[70ch] text-fg-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: PanelProps) {
  return (
    <section className={cx("flex min-w-0 flex-col rounded-lg bg-surface-1 hairline", className)}>
      {title || actions ? (
        <header className="flex items-start justify-between gap-3 px-4 pb-1 pt-4">
          <div className="min-w-0">
            {title ? <h2 className="type-title-sm truncate">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[12px] text-fg-subtle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div
        className={cx(
          "min-h-0 flex-1",
          padded && "p-4",
          title && padded ? "pt-3" : "",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-4 flex flex-wrap items-center gap-2.5", className)}>{children}</div>
  );
}
