import { Link, useRouterState } from "@tanstack/react-router";
import { Logo, Tooltip, cx } from "@joymusic/ui";
import { useI18n } from "../i18n";
import { OrgSwitcher } from "./org-switcher";
import { isActivePath, navGroups, navItems } from "./nav";
import { UserMenu } from "./user-menu";

export function Sidebar() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <aside className="flex w-16 shrink-0 flex-col gap-5 border-r border-[var(--jm-line)] bg-surface-1 px-2.5 pb-3 pt-4 min-[1180px]:w-60 min-[1180px]:px-3">
      <div className="flex h-7 items-center px-2 max-[1179px]:justify-center max-[1179px]:px-0">
        <Logo variant="horizontal" height={26} className="max-[1179px]:hidden" />
        <Logo variant="mark" height={26} className="min-[1180px]:hidden" />
      </div>
      <OrgSwitcher />
      <nav
        aria-label={t("shell.navigation")}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      >
        {navGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            <p className="type-eyebrow px-3 pb-1.5 text-fg-disabled max-[1179px]:hidden">
              {t(group.label)}
            </p>
            <div className="mx-2 mb-1 hidden h-px bg-[var(--jm-line)] max-[1179px]:block" />
            {navItems
              .filter((item) => item.group === group.id)
              .map((item) => {
                const active = isActivePath(item, pathname);
                const Icon = item.icon;
                return (
                  <Tooltip
                    key={item.id}
                    side="right"
                    content={t(item.label)}
                    shortcut={
                      <span className="type-mono text-[11px]">G {item.chord.toUpperCase()}</span>
                    }
                    delayDuration={200}
                  >
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      aria-label={t(item.label)}
                      className={cx(
                        "focus-ring flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] font-semibold transition-colors max-[1179px]:justify-center max-[1179px]:px-0",
                        active
                          ? "bg-brand-soft text-fg shadow-[inset_2px_0_0_var(--jm-brand)]"
                          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cx(
                          "size-[17px] shrink-0",
                          active ? "text-brand" : "text-fg-subtle",
                        )}
                      />
                      <span className="max-[1179px]:hidden">{t(item.label)}</span>
                    </Link>
                  </Tooltip>
                );
              })}
          </div>
        ))}
      </nav>
      <UserMenu variant="sidebar" />
    </aside>
  );
}
