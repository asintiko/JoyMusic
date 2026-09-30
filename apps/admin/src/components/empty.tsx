import { EmptyState, type EmptyStateProps } from "@joymusic/ui";

export function Empty({ size = "md", ...props }: EmptyStateProps) {
  return (
    <div className={`jm-empty jm-empty-${size}`}>
      <EmptyState size={size} {...props} />
    </div>
  );
}
