import { RefreshCw } from "lucide-react";
import { Button, Skeleton } from "@joymusic/ui";
import { describeError } from "../lib/api-errors";
import { useT } from "../i18n";
import { errorText } from "../lib/error-messages";
import { Empty } from "./empty";

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const description = describeError(error);
  return (
    <Empty
      illustration={description.kind === "network" ? "offline" : "error"}
      title={t(description.kind === "network" ? "error.network.title" : "error.generic.title")}
      description={errorText(t, error)}
      action={
        onRetry ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw aria-hidden="true" className="size-4" />}
            onClick={onRetry}
          >
            {t("common.retry")}
          </Button>
        ) : undefined
      }
    />
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="overflow-hidden rounded-lg bg-surface-1 hairline"
    >
      <div className="h-10 bg-surface-2" />
      {Array.from({ length: rows }, (_row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex h-[52px] items-center gap-6 border-t border-[var(--jm-line)] px-4"
        >
          {Array.from({ length: columns }, (_cell, cellIndex) => (
            <Skeleton
              key={cellIndex}
              shape="text"
              height={12}
              width={cellIndex === 0 ? "22%" : `${10 + ((cellIndex * 7 + rowIndex * 3) % 12)}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="flex h-[118px] flex-col justify-between rounded-lg bg-surface-1 p-4 hairline">
      <Skeleton shape="text" width="40%" height={10} />
      <Skeleton shape="text" width="55%" height={28} />
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex items-end gap-1.5"
      style={{ height }}
    >
      {Array.from({ length: 24 }, (_bar, index) => (
        <Skeleton
          key={index}
          className="flex-1"
          height={`${20 + ((index * 37) % 65)}%`}
          style={{ borderRadius: 5 }}
        />
      ))}
    </div>
  );
}
