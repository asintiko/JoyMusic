import { RefreshCw, WifiOff } from "lucide-react";
import { Button, Spinner } from "@joymusic/ui";
import type { RealtimeConnectionStatus } from "../../../common/bridge";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";

export function OfflineBanner({ realtime }: { realtime: RealtimeConnectionStatus }) {
  const t = useT();
  const net = useTopic("net");
  const outbox = useTopic("outbox");
  const offline = !net.online;
  const reconnecting = net.online && realtime === "closed";
  if (!offline && !reconnecting && outbox.pending === 0) return null;
  const tone = offline ? "bg-danger-soft text-danger-fg" : "bg-next-soft text-next-fg";
  return (
    <div
      role={offline ? "alert" : "status"}
      data-testid="offline-banner"
      data-mode={offline ? "offline" : reconnecting ? "reconnecting" : "syncing"}
      className={`flex shrink-0 items-center gap-3 border-b border-line px-4 py-2 text-[13px] font-bold ${tone}`}
    >
      {offline ? <WifiOff aria-hidden="true" className="size-4" /> : <Spinner size={16} />}
      <span>{offline ? t.offlineTitle : reconnecting ? t.reconnecting : t.syncing}</span>
      <span className="font-medium opacity-90">
        {outbox.pending > 0 ? t.offlineSaved(outbox.pending) : offline ? t.offlineStale : ""}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="ml-auto"
        leftIcon={<RefreshCw aria-hidden="true" className="size-3.5" />}
        onClick={() => void getBridge().commands.retryOutbox()}
      >
        {t.retryNow}
      </Button>
    </div>
  );
}
