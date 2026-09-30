import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  AdminVenue,
  BannedWord,
  Member,
  MemberRole,
  QrCode,
  VenueCreateInput,
  VenueUpdateInput,
} from "@joymusic/shared";
import { api } from "../lib/api";
import { useOrganizationId } from "../lib/use-session";
import type { DateRange } from "../lib/chart-data";

export const queryKeys = {
  venues: (org: string) => [org, "venues"] as const,
  venue: (org: string, id: string) => [org, "venue", id] as const,
  qr: (org: string, venueId: string) => [org, "qr", venueId] as const,
  members: (org: string) => [org, "members"] as const,
  sessions: (org: string, venueId: string) => [org, "sessions", venueId] as const,
  analytics: (org: string, venueId: string | null, range: DateRange) =>
    [org, "analytics", venueId, range.from, range.to] as const,
  words: (org: string) => [org, "words"] as const,
  audit: (org: string, limit: number) => [org, "audit", limit] as const,
  slug: (slug: string) => ["slug", slug] as const,
};

interface Snapshot<T> {
  key: QueryKey;
  previous: T | undefined;
}

function patch<T>(client: QueryClient, key: QueryKey, updater: (current: T) => T): Snapshot<T> {
  const previous = client.getQueryData<T>(key);
  if (previous !== undefined) client.setQueryData<T>(key, updater(previous));
  return { key, previous };
}

function restore<T>(client: QueryClient, snapshot: Snapshot<T> | undefined) {
  if (snapshot && snapshot.previous !== undefined) {
    client.setQueryData(snapshot.key, snapshot.previous);
  }
}

export function useVenues() {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.venues(org),
    queryFn: async () => (await api.call("adminVenues")).venues,
    staleTime: 30_000,
  });
}

export function useVenue(venueId: string | null | undefined) {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.venue(org, venueId ?? ""),
    queryFn: () => api.call("adminVenueGet", { params: { venueId: venueId ?? "" } }),
    enabled: Boolean(venueId),
    staleTime: 15_000,
  });
}

export function useCreateVenue() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (body: VenueCreateInput) => api.call("adminVenueCreate", { body }),
    onSuccess: (venue) => {
      client.setQueryData<AdminVenue[]>(queryKeys.venues(org), (current) =>
        current ? [...current, venue] : [venue],
      );
      client.setQueryData(queryKeys.venue(org, venue.id), venue);
      void client.invalidateQueries({ queryKey: queryKeys.venues(org) });
    },
  });
}

export function useUpdateVenue(venueId: string) {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (body: VenueUpdateInput) =>
      api.call("adminVenueUpdate", { params: { venueId }, body }),
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: queryKeys.venue(org, venueId) });
      const merge = (venue: AdminVenue): AdminVenue => ({
        ...venue,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.theme !== undefined ? { theme: body.theme } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
        settings: { ...venue.settings, ...body.settings },
      });
      const single = patch<AdminVenue>(client, queryKeys.venue(org, venueId), merge);
      const list = patch<AdminVenue[]>(client, queryKeys.venues(org), (current) =>
        current.map((venue) => (venue.id === venueId ? merge(venue) : venue)),
      );
      return { single, list };
    },
    onError: (_error, _body, context) => {
      restore(client, context?.single);
      restore(client, context?.list);
    },
    onSuccess: (venue) => {
      client.setQueryData(queryKeys.venue(org, venueId), venue);
      client.setQueryData<AdminVenue[]>(queryKeys.venues(org), (current) =>
        current?.map((entry) => (entry.id === venue.id ? venue : entry)),
      );
    },
  });
}

export function useDeleteVenue() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (venueId: string) => api.call("adminVenueDelete", { params: { venueId } }),
    onSuccess: (_result, venueId) => {
      client.setQueryData<AdminVenue[]>(queryKeys.venues(org), (current) =>
        current?.filter((venue) => venue.id !== venueId),
      );
      client.removeQueries({ queryKey: queryKeys.venue(org, venueId) });
    },
  });
}

export function useQrCodes(venueId: string | null | undefined) {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.qr(org, venueId ?? ""),
    queryFn: async () =>
      (await api.call("adminQrList", { params: { venueId: venueId ?? "" } })).codes,
    enabled: Boolean(venueId),
    staleTime: 10_000,
  });
}

export function useCreateQr(venueId: string) {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (label: string) =>
      api.call("adminQrCreate", { params: { venueId }, body: { label } }),
    onSuccess: (code) => {
      client.setQueryData<QrCode[]>(queryKeys.qr(org, venueId), (current) =>
        current ? [...current, code] : [code],
      );
    },
  });
}

export function useUpdateQr(venueId: string) {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (input: { id: string; label?: string; active?: boolean }) =>
      api.call("adminQrUpdate", {
        params: { id: input.id },
        body: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      }),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: queryKeys.qr(org, venueId) });
      return patch<QrCode[]>(client, queryKeys.qr(org, venueId), (current) =>
        current.map((code) =>
          code.id === input.id
            ? {
                ...code,
                ...(input.label !== undefined ? { label: input.label } : {}),
                ...(input.active !== undefined ? { active: input.active } : {}),
              }
            : code,
        ),
      );
    },
    onError: (_error, _input, context) => restore(client, context),
    onSuccess: (code) => {
      client.setQueryData<QrCode[]>(queryKeys.qr(org, venueId), (current) =>
        current?.map((entry) => (entry.id === code.id ? code : entry)),
      );
    },
  });
}

export function useDeleteQr(venueId: string) {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (id: string) => api.call("adminQrDelete", { params: { id } }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.qr(org, venueId) });
      return patch<QrCode[]>(client, queryKeys.qr(org, venueId), (current) =>
        current.filter((code) => code.id !== id),
      );
    },
    onError: (_error, _id, context) => restore(client, context),
  });
}

export function useMembers() {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.members(org),
    queryFn: async () => (await api.call("adminMembers")).members,
    staleTime: 15_000,
  });
}

export function useInviteMember() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (body: { email: string; role: MemberRole }) =>
      api.call("adminMemberInvite", { body }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.members(org) }),
  });
}

export function useUpdateMemberRole() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (input: { id: string; role: MemberRole }) =>
      api.call("adminMemberUpdate", { params: { id: input.id }, body: { role: input.role } }),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: queryKeys.members(org) });
      return patch<Member[]>(client, queryKeys.members(org), (current) =>
        current.map((member) =>
          member.id === input.id ? { ...member, role: input.role } : member,
        ),
      );
    },
    onError: (_error, _input, context) => restore(client, context),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.members(org) }),
  });
}

export function useRemoveMember() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (id: string) => api.call("adminMemberDelete", { params: { id } }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.members(org) });
      return patch<Member[]>(client, queryKeys.members(org), (current) =>
        current.filter((member) => member.id !== id),
      );
    },
    onError: (_error, _id, context) => restore(client, context),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.members(org) }),
  });
}

export function useSessions(venueId: string | null | undefined, limit = 50) {
  const org = useOrganizationId();
  return useQuery({
    queryKey: [...queryKeys.sessions(org, venueId ?? ""), limit],
    queryFn: async () =>
      (await api.call("adminSessions", { params: { venueId: venueId ?? "" }, query: { limit } }))
        .sessions,
    enabled: Boolean(venueId),
    staleTime: 15_000,
  });
}

export function useAnalytics(venueId: string | null, range: DateRange, enabled = true) {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.analytics(org, venueId, range),
    queryFn: () =>
      api.call("adminAnalytics", {
        query: { ...(venueId ? { venueId } : {}), from: range.from, to: range.to },
      }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

export function useBannedWords() {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.words(org),
    queryFn: async () => (await api.call("adminBannedWords")).words,
    staleTime: 30_000,
  });
}

export function useAddBannedWord() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (word: string) => api.call("adminBannedWordAdd", { body: { word } }),
    onMutate: async (word) => {
      await client.cancelQueries({ queryKey: queryKeys.words(org) });
      return patch<BannedWord[]>(client, queryKeys.words(org), (current) => [
        { id: `pending-${word}`, word, createdAt: new Date().toISOString() },
        ...current,
      ]);
    },
    onError: (_error, _word, context) => restore(client, context),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.words(org) }),
  });
}

export function useRemoveBannedWord() {
  const client = useQueryClient();
  const org = useOrganizationId();
  return useMutation({
    mutationFn: (id: string) => api.call("adminBannedWordDelete", { params: { id } }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.words(org) });
      return patch<BannedWord[]>(client, queryKeys.words(org), (current) =>
        current.filter((word) => word.id !== id),
      );
    },
    onError: (_error, _id, context) => restore(client, context),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.words(org) }),
  });
}

export function useBanDevice() {
  return useMutation({
    mutationFn: (input: { venueId: string; deviceId: string }) =>
      api.call("adminDeviceBan", { params: input }),
  });
}

export function useAudit(limit: number) {
  const org = useOrganizationId();
  return useQuery({
    queryKey: queryKeys.audit(org, limit),
    queryFn: async () => (await api.call("adminAudit", { query: { limit } })).entries,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
