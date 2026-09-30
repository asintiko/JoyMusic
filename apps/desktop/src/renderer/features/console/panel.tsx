import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";

export interface PanelProps {
  title: string;
  count?: string | number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Panel({ title, count, action, children, className, id }: PanelProps) {
  return (
    <section
      aria-labelledby={id ? `${id}-title` : undefined}
      data-panel={id}
      className={cx(
        "flex min-h-0 flex-col overflow-hidden rounded-xl bg-surface-1 hairline",
        className,
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <h2 id={id ? `${id}-title` : undefined} className="type-eyebrow text-fg">
          {title}
        </h2>
        {count !== undefined ? (
          <span
            data-testid={id ? `${id}-count` : undefined}
            className="type-mono rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted"
          >
            {count}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">{action}</span>
      </header>
      {children}
    </section>
  );
}
