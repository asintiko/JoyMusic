import { Button } from "@joymusic/ui";
import { useT } from "../i18n";

export function SaveBar({
  visible,
  saving,
  disabled,
  onSave,
  onReset,
}: {
  visible: boolean;
  saving: boolean;
  disabled?: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const t = useT();
  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label={t("common.unsaved")}
      className="jm-rise sticky bottom-4 z-sticky mt-6 flex items-center justify-between gap-4 rounded-lg bg-surface-4 px-4 py-3 shadow-[var(--jm-shadow-4)] hairline-strong"
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-fg-muted">
        <span className="size-2 rounded-full bg-next" aria-hidden="true" />
        {t("common.unsaved")}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
          {t("common.reset")}
        </Button>
        <Button size="sm" onClick={onSave} loading={saving} disabled={disabled}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
