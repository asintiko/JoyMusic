import { Search } from "lucide-react";
import { Shortcut } from "@joymusic/ui";
import { useT } from "../i18n";
import { LanguageSwitcher } from "../components/language-switcher";
import { RouteBreadcrumbs } from "./breadcrumbs";
import { UserMenu } from "./user-menu";
import { VenuePicker } from "./venue-picker";

export function Topbar({
  onOpenPalette,
  onOpenShortcuts,
}: {
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
}) {
  const t = useT();
  return (
    <header className="z-header flex h-14 shrink-0 items-center gap-4 border-b border-[var(--jm-line)] bg-canvas/80 px-6 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        <RouteBreadcrumbs />
      </div>
      <button
        type="button"
        onClick={onOpenPalette}
        className="focus-ring inline-flex h-9 w-[280px] items-center gap-2.5 rounded-md bg-surface-2 px-3 text-[13px] font-medium text-fg-subtle hairline transition-colors hover:bg-surface-3 max-[1099px]:w-9 max-[1099px]:justify-center max-[1099px]:px-0"
        aria-label={t("shell.search")}
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1 truncate whitespace-nowrap text-left max-[1099px]:hidden">
          {t("shell.searchPlaceholder")}
        </span>
        <Shortcut keys={["mod", "k"]} className="max-[1099px]:hidden" />
      </button>
      <VenuePicker />
      <LanguageSwitcher />
      <button
        type="button"
        onClick={onOpenShortcuts}
        aria-label={t("shortcuts.title")}
        className="focus-ring hidden size-9 items-center justify-center rounded-md text-[15px] font-bold text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg min-[1100px]:inline-flex"
      >
        ?
      </button>
      <UserMenu variant="topbar" />
    </header>
  );
}
