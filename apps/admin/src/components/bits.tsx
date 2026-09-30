import type { AdminVenue, VenueTheme } from "@joymusic/shared";
import { Avatar, Badge, Tabs, TabsList, TabsTrigger, type BadgeTone } from "@joymusic/ui";
import { useT } from "../i18n";
import { rangePresets, type RangePreset } from "../lib/chart-data";

const themeTone: Record<VenueTheme, BadgeTone> = { club: "brand", lounge: "next", cafe: "info" };

export function ThemeBadge({ theme }: { theme: VenueTheme }) {
  const t = useT();
  return (
    <Badge size="sm" tone={themeTone[theme]}>
      {t(`theme.${theme}`)}
    </Badge>
  );
}

export function LiveBadge({ venue }: { venue: Pick<AdminVenue, "activeSessionId" | "settings"> }) {
  const t = useT();
  if (venue.activeSessionId) {
    return (
      <Badge size="sm" tone="playing" dot>
        {venue.settings.requestsOpen ? t("status.live") : t("status.livePaused")}
      </Badge>
    );
  }
  return (
    <Badge size="sm" tone="neutral" dot>
      {t("status.idle")}
    </Badge>
  );
}

export function VenueAvatar({
  venue,
  size = 24,
}: {
  venue: Pick<AdminVenue, "name" | "logoUrl">;
  size?: number;
}) {
  return <Avatar name={venue.name} src={venue.logoUrl} size={size} />;
}

export function RangeTabs({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (next: RangePreset) => void;
}) {
  const t = useT();
  return (
    <Tabs
      variant="segmented"
      value={String(value)}
      onValueChange={(next) => onChange(Number(next) as RangePreset)}
    >
      <TabsList aria-label={t("range.label")}>
        {rangePresets.map((days) => (
          <TabsTrigger key={days} value={String(days)}>
            {t(`range.d${days}` as "range.d7")}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function RoleBadge({ role }: { role: "owner" | "admin" | "dj" }) {
  const t = useT();
  const tone: BadgeTone = role === "owner" ? "brand" : role === "admin" ? "info" : "neutral";
  return (
    <Badge size="sm" tone={tone}>
      {t(`role.${role}`)}
    </Badge>
  );
}
