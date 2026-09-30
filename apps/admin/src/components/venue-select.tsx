import { Select } from "@joymusic/ui";
import { useT } from "../i18n";
import { useVenueScope } from "../lib/venue-scope";

export function VenueSelect({
  allowAll = false,
  className,
}: {
  allowAll?: boolean;
  className?: string;
}) {
  const t = useT();
  const scope = useVenueScope();
  if (scope.venues.length === 0) return null;
  const value = allowAll ? (scope.venueId ?? "") : (scope.effective?.id ?? "");
  return (
    <Select
      aria-label={t("shell.venuePicker")}
      value={value}
      onChange={(event) => scope.setVenueId(event.target.value === "" ? null : event.target.value)}
      wrapperClassName={className ?? "w-[220px]"}
    >
      {allowAll ? <option value="">{t("shell.allVenues")}</option> : null}
      {scope.venues.map((venue) => (
        <option key={venue.id} value={venue.id}>
          {venue.name}
        </option>
      ))}
    </Select>
  );
}
