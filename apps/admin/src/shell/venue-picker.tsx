import { ChevronDown, Store } from "lucide-react";
import { useI18n } from "../i18n";
import { useVenueScope } from "../lib/venue-scope";
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../components/menu";

const allValue = "__all__";

export function VenuePicker() {
  const { t } = useI18n();
  const scope = useVenueScope();
  if (!scope.loading && scope.venues.length === 0) return null;
  const label = scope.selected ? scope.selected.name : t("shell.allVenues");
  return (
    <Menu>
      <MenuTrigger
        aria-label={t("shell.venuePicker")}
        className="focus-ring inline-flex h-9 max-w-[220px] items-center gap-2 rounded-md bg-surface-2 px-3 text-[13px] font-bold text-fg-muted hairline transition-colors hover:bg-surface-3 hover:text-fg data-[state=open]:bg-surface-3"
      >
        <Store aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
        <span className="truncate max-[899px]:hidden">{label}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
      </MenuTrigger>
      <MenuContent align="end" className="w-[260px]">
        <MenuLabel>{t("shell.venuePicker")}</MenuLabel>
        <MenuRadioGroup
          value={scope.venueId ?? allValue}
          onValueChange={(value) => scope.setVenueId(value === allValue ? null : value)}
        >
          <MenuRadioItem value={allValue}>{t("shell.allVenues")}</MenuRadioItem>
          {scope.venues.map((venue) => (
            <MenuRadioItem key={venue.id} value={venue.id}>
              <span className="min-w-0 flex-1 truncate">{venue.name}</span>
              {venue.activeSessionId ? (
                <span className="size-1.5 rounded-full bg-playing" aria-label={t("status.live")} />
              ) : null}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
