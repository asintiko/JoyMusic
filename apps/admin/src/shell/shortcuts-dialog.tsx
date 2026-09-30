import { Dialog, Shortcut } from "@joymusic/ui";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n";
import { navItems } from "./nav";

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const general: Array<{ keys: string[]; label: MessageKey }> = [
    { keys: ["mod", "k"], label: "shortcuts.palette" },
    { keys: ["?"], label: "shortcuts.help" },
    { keys: ["n"], label: "shortcuts.new" },
    { keys: ["esc"], label: "shortcuts.close" },
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("shortcuts.title")}
      description={t("shortcuts.description")}
      size="md"
      closeLabel={t("common.close")}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="type-eyebrow mb-2 text-fg-subtle">{t("shortcuts.general")}</h3>
          <ul className="flex flex-col">
            {general.map((entry) => (
              <li
                key={entry.label}
                className="flex h-9 items-center justify-between gap-3 border-b border-[var(--jm-line)] text-[13px] last:border-b-0"
              >
                <span className="text-fg-muted">{t(entry.label)}</span>
                <Shortcut keys={entry.keys} />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="type-eyebrow mb-2 text-fg-subtle">{t("shortcuts.navigation")}</h3>
          <ul className="flex flex-col">
            {navItems.map((item) => (
              <li
                key={item.id}
                className="flex h-9 items-center justify-between gap-3 border-b border-[var(--jm-line)] text-[13px] last:border-b-0"
              >
                <span className="text-fg-muted">{t(item.label)}</span>
                <Shortcut keys={["g", item.chord]} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  );
}
