import { ChevronsUpDown } from "lucide-react";
import { Avatar } from "@joymusic/ui";
import { useI18n } from "../i18n";
import { session } from "../lib/api";
import { membershipFor } from "../lib/permissions";
import { useSession } from "../lib/use-session";
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../components/menu";
import { useVenues } from "../queries";

export function OrgSwitcher() {
  const { t } = useI18n();
  const state = useSession();
  const venues = useVenues();
  const membership = membershipFor(state.me, state.activeOrganizationId);
  if (!state.me || !membership) return null;
  const count = venues.data?.length;
  const trigger = (
    <button
      type="button"
      aria-label={t("shell.organization")}
      className="focus-ring flex h-11 w-full items-center gap-2.5 rounded-md bg-surface-2 px-2.5 text-left hairline transition-colors hover:bg-surface-3 data-[state=open]:bg-surface-3 max-[1179px]:justify-center max-[1179px]:px-0"
    >
      <Avatar name={membership.organizationName} size={28} />
      <>
        <span className="min-w-0 flex-1 leading-tight max-[1179px]:hidden">
          <span className="block truncate text-[13px] font-bold">
            {membership.organizationName}
          </span>
          <span className="block truncate text-[11px] text-fg-subtle">
            {count === undefined ? " " : t("shell.venuesCount", { count })}
          </span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 text-fg-subtle max-[1179px]:hidden" />
      </>
    </button>
  );
  if (state.me.memberships.length < 2) return trigger;
  return (
    <Menu>
      <MenuTrigger asChild>{trigger}</MenuTrigger>
      <MenuContent className="w-[248px]">
        <MenuLabel>{t("shell.organizations")}</MenuLabel>
        <MenuRadioGroup
          value={state.activeOrganizationId ?? ""}
          onValueChange={(id) => session.setActiveOrganization(id)}
        >
          {state.me.memberships.map((entry) => (
            <MenuRadioItem key={entry.organizationId} value={entry.organizationId}>
              <Avatar name={entry.organizationName} size={22} />
              <span className="min-w-0 flex-1 truncate">{entry.organizationName}</span>
              <span className="type-mono text-[10px] uppercase text-fg-subtle">{entry.role}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
