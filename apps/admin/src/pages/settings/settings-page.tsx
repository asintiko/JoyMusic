import { locales, type Locale } from "@joymusic/shared";
import { useRouter } from "@tanstack/react-router";
import { Info, LogOut } from "lucide-react";
import { Avatar, Button, Chip, ChipRow } from "@joymusic/ui";
import { RoleBadge } from "../../components/bits";
import { PageHeader, Panel } from "../../components/page";
import { useI18n } from "../../i18n";
import { session } from "../../lib/api";
import { capabilitiesOf } from "../../lib/permissions";
import { useSession } from "../../lib/use-session";

const localeNames: Record<Locale, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const state = useSession();
  const user = state.me?.user;
  if (!user || !state.me) return null;
  const capabilities = capabilitiesOf(state.role);

  return (
    <>
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />
      <div className="grid items-start gap-5 min-[1100px]:grid-cols-2">
        <Panel title={t("settings.profile")}>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} size={56} />
            <div className="min-w-0">
              <p className="type-title-md truncate">{user.name}</p>
              <p className="text-[13px] text-fg-muted">{user.email}</p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-[12.5px] text-fg-muted">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            {t("settings.profileReadonly")}
          </p>
          <div className="mt-5 flex justify-end">
            <Button
              variant="secondary"
              leftIcon={<LogOut aria-hidden="true" className="size-4" />}
              onClick={() => void session.signOut().then(() => router.history.push("/login"))}
            >
              {t("auth.logout")}
            </Button>
          </div>
        </Panel>

        <Panel title={t("settings.language")} subtitle={t("settings.languageHint")}>
          <ChipRow bleed={false} className="flex-wrap">
            {locales.map((code) => (
              <Chip key={code} selected={locale === code} onClick={() => setLocale(code)}>
                {localeNames[code]}
              </Chip>
            ))}
          </ChipRow>
        </Panel>

        <Panel title={t("settings.organizations")} subtitle={t("settings.organizationsHint")}>
          <ul className="flex flex-col divide-y divide-[var(--jm-line)]">
            {state.me.memberships.map((entry) => (
              <li
                key={entry.organizationId}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Avatar name={entry.organizationName} size={32} />
                <span className="min-w-0 flex-1 truncate font-bold">{entry.organizationName}</span>
                {entry.organizationId === state.activeOrganizationId ? (
                  <span className="text-[11px] font-semibold text-playing-fg">
                    {t("settings.active")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="focus-ring rounded-xs text-[12px] font-bold text-brand hover:underline"
                    onClick={() => session.setActiveOrganization(entry.organizationId)}
                  >
                    {t("settings.switch")}
                  </button>
                )}
                <RoleBadge role={entry.role} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t("settings.access")} subtitle={t("settings.accessHint")}>
          <ul className="flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="rounded-pill bg-surface-3 px-3 py-1 text-[12px] font-semibold text-fg-muted"
              >
                {t(`capability.${capability}`)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
