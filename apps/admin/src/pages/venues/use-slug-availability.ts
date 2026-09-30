import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { session } from "../../lib/api";
import { isNotFound } from "../../lib/api-errors";
import { isValidSlug } from "../../lib/slug";
import { queryKeys } from "../../queries";

export type SlugStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "unknown";

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export function useSlugAvailability(slug: string, ignore?: boolean): SlugStatus {
  const debounced = useDebounced(slug, 350);
  const valid = isValidSlug(slug);
  const settled = debounced === slug;
  const query = useQuery({
    queryKey: queryKeys.slug(debounced),
    queryFn: async () => {
      try {
        await session.publicClient.call("venuePublic", { params: { slug: debounced } });
        return "taken" as const;
      } catch (error) {
        if (isNotFound(error)) return "available" as const;
        throw error;
      }
    },
    enabled: valid && isValidSlug(debounced) && !ignore,
    staleTime: 10_000,
    retry: false,
  });
  if (!slug) return "idle";
  if (!valid) return "invalid";
  if (ignore) return "idle";
  if (!settled || query.isFetching) return "checking";
  if (query.isError) return "unknown";
  return query.data ?? "checking";
}
