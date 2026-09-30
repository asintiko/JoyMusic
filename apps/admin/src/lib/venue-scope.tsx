import type { AdminVenue } from "@joymusic/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useVenues } from "../queries";
import { browserStorage, readValue, writeValue } from "./storage";
import { useOrganizationId } from "./use-session";

interface VenueScopeValue {
  venueId: string | null;
  setVenueId: (id: string | null) => void;
  venues: AdminVenue[];
  loading: boolean;
  selected: AdminVenue | null;
  effective: AdminVenue | null;
}

const VenueScopeContext = createContext<VenueScopeValue | null>(null);

function storageKey(org: string): string {
  return `joymusic.admin.venue.${org}`;
}

export function VenueScopeProvider({ children }: { children: ReactNode }) {
  const org = useOrganizationId();
  const venuesQuery = useVenues();
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);
  const [venueId, setVenueIdState] = useState<string | null>(() =>
    readValue(browserStorage(), storageKey(org)),
  );

  useEffect(() => {
    setVenueIdState(readValue(browserStorage(), storageKey(org)));
  }, [org]);

  const setVenueId = useCallback(
    (id: string | null) => {
      writeValue(browserStorage(), storageKey(org), id);
      setVenueIdState(id);
    },
    [org],
  );

  const value = useMemo<VenueScopeValue>(() => {
    const selected = venues.find((venue) => venue.id === venueId) ?? null;
    return {
      venueId: selected ? selected.id : null,
      setVenueId,
      venues,
      loading: venuesQuery.isPending,
      selected,
      effective: selected ?? venues[0] ?? null,
    };
  }, [venues, venueId, setVenueId, venuesQuery.isPending]);

  return <VenueScopeContext.Provider value={value}>{children}</VenueScopeContext.Provider>;
}

export function useVenueScope(): VenueScopeValue {
  const value = useContext(VenueScopeContext);
  if (!value) throw new Error("VenueScopeProvider is missing");
  return value;
}
