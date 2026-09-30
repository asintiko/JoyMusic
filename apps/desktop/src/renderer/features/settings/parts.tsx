import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";

export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
  testId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cx("flex flex-col gap-4 rounded-xl bg-surface-1 p-5 hairline", className)}
    >
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
          {description ? <p className="mt-1 text-[13px] text-fg-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{label}</p>
        {description ? <p className="mt-0.5 text-[12.5px] text-fg-muted">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
