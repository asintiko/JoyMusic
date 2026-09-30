import { MonitorPlay, MonitorX } from "lucide-react";
import { Button, Chip, Select, Switch } from "@joymusic/ui";
import { venueThemes } from "@joymusic/shared";
import type { StageTheme } from "../../../common/settings";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { useStageControl } from "../../state/stage-control";
import { Row, SettingsCard } from "./parts";

export function StageTab() {
  const t = useT();
  const settings = useTopic("settings");
  const session = useTopic("session");
  const { stage, open, close } = useStageControl();
  const displays = stage.displays;
  const chosen = settings.stage.displayId;
  const themes: StageTheme[] = ["venue", ...venueThemes];

  return (
    <div className="flex flex-col gap-4" data-testid="stage-tab">
      <SettingsCard title={t.stageWindow} description={t.stageWindowBody}>
        <Select
          label={t.stageDisplay}
          value={chosen === null ? "auto" : String(chosen)}
          data-testid="stage-display"
          onChange={(event) => {
            const value = event.target.value;
            void getBridge().settings.update({
              stage: { displayId: value === "auto" ? null : Number(value) },
            });
          }}
        >
          <option value="auto">{t.stageDisplayAuto}</option>
          {displays.map((display) => (
            <option key={display.id} value={display.id}>
              {display.label} - {display.width}x{display.height}
              {display.primary ? ` (${t.primaryDisplay})` : ""}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          {stage.open ? (
            <Button
              variant="secondary"
              leftIcon={<MonitorX aria-hidden="true" className="size-4" />}
              data-testid="stage-close"
              onClick={() => void close()}
            >
              {t.stageClose}
            </Button>
          ) : (
            <Button
              leftIcon={<MonitorPlay aria-hidden="true" className="size-4" />}
              data-testid="stage-open"
              disabled={!session}
              onClick={() => void open()}
            >
              {t.stageOpen}
            </Button>
          )}
          <Button variant="ghost" onClick={() => void getBridge().stage.refreshDisplays()}>
            {t.refresh}
          </Button>
        </div>
        {!session ? <p className="text-[12.5px] text-fg-muted">{t.stageNeedsSession}</p> : null}
      </SettingsCard>

      <SettingsCard title={t.stageTheme} description={t.stageThemeBody}>
        <div
          role="group"
          aria-label={t.stageTheme}
          className="flex flex-wrap gap-2"
          data-testid="stage-theme"
        >
          {themes.map((theme) => (
            <Chip
              key={theme}
              selected={settings.stage.theme === theme}
              data-testid={`stage-theme-${theme}`}
              onClick={() => void getBridge().settings.update({ stage: { theme } })}
            >
              {t.stageThemes[theme]}
            </Chip>
          ))}
        </div>
        <Row label={t.stageAutoOpen} description={t.stageAutoOpenBody}>
          <Switch
            checked={settings.stage.autoOpen}
            aria-label={t.stageAutoOpen}
            data-testid="stage-auto-open"
            onCheckedChange={(checked) =>
              void getBridge().settings.update({ stage: { autoOpen: checked } })
            }
          />
        </Row>
      </SettingsCard>
    </div>
  );
}
