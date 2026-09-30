import { Command, Maximize, MonitorPlay, Moon, Settings } from "lucide-react";
import { Avatar, Badge, IconButton, Logo, Shortcut, Switch, formatDuration } from "@joymusic/ui";
import type { SessionContext } from "../../../common/bridge";
import { useT } from "../../i18n";
import { useNow, useTopic } from "../../lib/topics";
import type { ConsoleController } from "./use-console";

export interface TopBarProps {
  session: SessionContext;
  controller: ConsoleController;
  djName: string;
  onOpenPalette(): void;
  onOpenSettings(): void;
  onToggleStage(): void;
  onToggleBooth(): void;
  onToggleLarge(): void;
}

export function TopBar({
  session,
  controller,
  djName,
  onOpenPalette,
  onOpenSettings,
  onToggleStage,
  onToggleBooth,
  onToggleLarge,
}: TopBarProps) {
  const t = useT();
  const now = useNow(1000);
  const stage = useTopic("stage");
  const settings = useTopic("settings");
  const startedAt = controller.state?.session?.startedAt;
  const elapsed = startedAt
    ? Math.max(0, Math.floor((now + controller.offsetMs - Date.parse(startedAt)) / 1000))
    : 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface-1 px-4">
      <Logo variant="horizontal" height={24} />
      <span className="h-5 w-px bg-line-strong" />
      <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
        <span className="truncate" data-testid="venue-name">
          {session.venueName}
        </span>
        <Badge tone="playing" dot size="sm">
          {t.session}
        </Badge>
        <span className="type-mono text-[12px] text-fg-muted" data-testid="session-timer">
          {formatDuration(elapsed)}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-pill bg-surface-2 py-1 pl-3.5 pr-1.5 hairline">
          <span className="text-[12.5px] font-bold text-fg" id="requests-open-label">
            {controller.requestsOpen ? t.requestsOpen : t.requestsClosed}
          </span>
          <Switch
            size="md"
            checked={controller.requestsOpen}
            aria-labelledby="requests-open-label"
            data-testid="requests-open-switch"
            onCheckedChange={controller.setRequestsOpen}
          />
        </div>
        <button
          type="button"
          onClick={onOpenPalette}
          className="focus-ring inline-flex h-9 items-center gap-2.5 rounded-md bg-surface-2 pl-3 pr-2 text-[13px] font-semibold text-fg-muted hairline hover:bg-surface-3"
        >
          <Command aria-hidden="true" className="size-4" />
          {t.commands}
          <Shortcut keys={["mod", "k"]} />
        </button>
        <IconButton
          label={stage.open ? t.stageClose : t.stageOpen}
          data-testid="stage-toggle"
          pressed={stage.open}
          variant={stage.open ? "primary" : "secondary"}
          size="md"
          icon={<MonitorPlay aria-hidden="true" className="size-[18px]" />}
          onClick={onToggleStage}
        />
        <IconButton
          label={t.boothMode}
          data-testid="booth-toggle"
          pressed={settings.boothMode}
          variant="secondary"
          size="md"
          icon={<Moon aria-hidden="true" className="size-[18px]" />}
          onClick={onToggleBooth}
        />
        <IconButton
          label={t.largeTargets}
          data-testid="large-toggle"
          pressed={settings.largeTargets}
          variant="secondary"
          size="md"
          icon={<Maximize aria-hidden="true" className="size-[18px]" />}
          onClick={onToggleLarge}
        />
        <IconButton
          label={t.settings}
          data-testid="settings-button"
          variant="secondary"
          size="md"
          icon={<Settings aria-hidden="true" className="size-[18px]" />}
          onClick={onOpenSettings}
        />
        <Avatar name={djName} size={34} status="online" />
      </div>
    </header>
  );
}
