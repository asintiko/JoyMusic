"use client";

import { useEffect, useRef } from "react";
import type { RequestItem, RequestStatus } from "@joymusic/shared";
import { useI18n } from "@/components/i18n";
import { useToast } from "@/components/toaster";
import { haptic } from "@/lib/haptics";

export function useMineNotifications(mine: Record<string, RequestItem>, onOpenMine: () => void) {
  const { t } = useI18n();
  const toast = useToast();
  const previous = useRef<Map<string, RequestStatus> | null>(null);

  useEffect(() => {
    const current = new Map(Object.values(mine).map((item) => [item.id, item.status] as const));
    const before = previous.current;
    previous.current = current;
    if (!before) return;
    for (const [id, status] of current) {
      const earlier = before.get(id);
      if (!earlier || earlier === status) continue;
      const item = mine[id];
      if (!item) continue;
      const description = `${item.title} · ${item.artist}`;
      if (status === "playing") {
        haptic("success");
        toast.toast({ id: `mine-${id}`, title: t.minePlaying, description, tone: "playing" });
      } else if (status === "accepted" && earlier === "pending") {
        haptic("tap");
        toast.toast({
          id: `mine-${id}`,
          title: t.mineAccepted,
          description,
          tone: "next",
          action: { label: t.viewMine, onClick: onOpenMine },
        });
      } else if (status === "declined") {
        haptic("warning");
        toast.toast({
          id: `mine-${id}`,
          title: t.mineDeclined,
          description: item.declineReason ? `${description} · ${item.declineReason}` : description,
          tone: "danger",
        });
      }
    }
  }, [mine, t, toast, onOpenMine]);
}
