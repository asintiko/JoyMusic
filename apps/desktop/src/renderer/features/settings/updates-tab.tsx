import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Badge, Button, ProgressBar, Switch } from "@joymusic/ui";
import type { BadgeTone } from "@joymusic/ui";
import type { UpdateStatus } from "../../../common/bridge";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { Row, SettingsCard } from "./parts";

const tones: Record<UpdateStatus, BadgeTone> = {
  disabled: "neutral",
  idle: "neutral",
  checking: "info",
  available: "info",
  downloading: "info",
  ready: "playing",
  notAvailable: "success",
  error: "danger",
};

export function UpdatesTab() {
  const t = useT();
  const updates = useTopic("updates");
  const settings = useTopic("settings");
  const [version, setVersion] = useState("");
  useEffect(() => {
    void getBridge()
      .info()
      .then((info) => setVersion(info.version));
  }, []);
  const busy = updates.status === "checking" || updates.status === "downloading";

  return (
    <div className="flex flex-col gap-4" data-testid="updates-tab">
      <SettingsCard
        title={t.updatesTitle}
        description={t.updatesBody}
        action={
          <Badge tone={tones[updates.status]} dot data-testid="update-status">
            {t.updateStates[updates.status]}
          </Badge>
        }
      >
        <Row
          label={t.currentVersion}
          description={updates.version ? `${t.newVersion}: ${updates.version}` : undefined}
        >
          <span className="type-mono text-[14px]" data-testid="app-version">
            v{version}
          </span>
        </Row>
        {updates.status === "downloading" && updates.progress !== null ? (
          <ProgressBar progress={updates.progress} label={t.updateStates.downloading} />
        ) : null}
        {updates.message ? <p className="text-[12.5px] text-danger-fg">{updates.message}</p> : null}
        <Row label={t.autoCheck}>
          <Switch
            checked={settings.updates.autoCheck}
            aria-label={t.autoCheck}
            onCheckedChange={(checked) =>
              void getBridge().settings.update({ updates: { autoCheck: checked } })
            }
          />
        </Row>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            loading={busy}
            disabled={updates.status === "disabled"}
            leftIcon={<RefreshCw aria-hidden="true" className="size-4" />}
            data-testid="check-updates"
            onClick={() => void getBridge().updates.check()}
          >
            {t.checkUpdates}
          </Button>
          {updates.status === "ready" ? (
            <Button
              leftIcon={<Download aria-hidden="true" className="size-4" />}
              onClick={() => void getBridge().updates.install()}
            >
              {t.installUpdate}
            </Button>
          ) : null}
        </div>
        {updates.status === "disabled" ? (
          <p className="text-[12.5px] text-fg-muted">{t.updatesDisabled}</p>
        ) : null}
      </SettingsCard>
    </div>
  );
}
