import { Piano } from "lucide-react";
import { Badge, Button, EmptyState, Switch } from "@joymusic/ui";
import type { ConsoleAction } from "@joymusic/dj-bridge/midi";
import { actionKey, midiPresets } from "@joymusic/dj-bridge/midi";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { useMidi } from "../../state/midi";
import { Row, SettingsCard } from "./parts";

const learnableActions: readonly ConsoleAction[] = [
  { type: "acceptTop" },
  { type: "declineTop" },
  { type: "playNext" },
  { type: "pushToAir" },
  { type: "markPlayed" },
  { type: "toggleRequestsOpen" },
  { type: "moveSelection", delta: 1 },
  { type: "moveSelection", delta: -1 },
];

export function MidiTab() {
  const t = useT();
  const settings = useTopic("settings");
  const midi = useMidi();
  const inputs = midi.devices.filter((device) => device.direction === "input");

  const bindingFor = (action: ConsoleAction) =>
    midi.bindings.find((binding) => actionKey(binding.action) === actionKey(action));

  return (
    <div className="flex flex-col gap-4" data-testid="midi-tab">
      <SettingsCard
        title={t.midiTitle}
        description={t.midiBody}
        action={
          <Switch
            checked={settings.midi.enabled}
            aria-label={t.midiTitle}
            data-testid="midi-enabled"
            onCheckedChange={(checked) =>
              void getBridge().settings.update({ midi: { enabled: checked } })
            }
          />
        }
      >
        <Row label={t.midiLeds} description={t.midiLedsBody}>
          <Switch
            checked={settings.midi.ledFeedback}
            aria-label={t.midiLeds}
            data-testid="midi-leds"
            onCheckedChange={(checked) =>
              void getBridge().settings.update({ midi: { ledFeedback: checked } })
            }
          />
        </Row>
      </SettingsCard>

      {midi.status === "unsupported" || midi.status === "denied" ? (
        <EmptyState
          size="sm"
          illustration="error"
          title={midi.status === "denied" ? t.midiDenied : t.midiUnsupported}
        />
      ) : null}

      {midi.status === "ready" ? (
        <>
          <SettingsCard title={t.midiDevicesTitle} testId="midi-devices">
            {inputs.length === 0 ? (
              <p className="text-[13px] text-fg-muted">{t.midiNoDevices}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {inputs.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 text-[14px]">
                    <Piano aria-hidden="true" className="size-4 text-fg-subtle" />
                    <span className="font-semibold">{device.name || device.id}</span>
                    <span className="text-fg-subtle">{device.manufacturer}</span>
                    <Badge
                      size="sm"
                      tone={device.connected ? "playing" : "neutral"}
                      dot
                      className="ml-auto"
                    >
                      {device.connected ? t.connected : t.disconnected}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SettingsCard>

          <SettingsCard title={t.midiPresets} description={t.midiPresetsBody}>
            <ul className="flex flex-col gap-2" data-testid="midi-presets">
              {midiPresets.map((preset) => (
                <li key={preset.id} className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold">{preset.name}</span>
                  {!preset.verified ? (
                    <Badge tone="next" size="sm">
                      {t.unverified}
                    </Badge>
                  ) : null}
                  {midi.detectedPreset?.id === preset.id ? (
                    <Badge tone="info" size="sm">
                      {t.detected}
                    </Badge>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    data-testid={`preset-${preset.id}`}
                    onClick={() =>
                      void midi
                        .applyPreset(preset.id)
                        .then(() => getBridge().settings.update({ midi: { presetId: preset.id } }))
                    }
                  >
                    {t.apply}
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-fg-muted">{t.midiUnverifiedNote}</p>
          </SettingsCard>

          <SettingsCard title={t.midiMapping} description={t.midiMappingBody}>
            <ul className="flex flex-col gap-2" data-testid="midi-mapping">
              {learnableActions.map((action) => {
                const binding = bindingFor(action);
                const learning =
                  midi.learning !== null && actionKey(midi.learning) === actionKey(action);
                return (
                  <li key={actionKey(action)} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-[14px] font-semibold">
                      {t.midiActions[actionKey(action)] ?? actionKey(action)}
                    </span>
                    <span className="type-mono w-[130px] text-[12px] text-fg-muted">
                      {binding
                        ? `${binding.match.type === "cc" ? "CC" : "Note"} ${binding.match.number} / ch ${binding.match.channel}`
                        : t.unassigned}
                    </span>
                    {learning ? (
                      <Button size="sm" variant="secondary" onClick={midi.cancelLearn}>
                        {t.midiPress}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        data-testid={`learn-${actionKey(action)}`}
                        onClick={() => void midi.learn(action)}
                      >
                        {t.learn}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!binding}
                      onClick={() => midi.clear(action)}
                    >
                      {t.clear}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </SettingsCard>
        </>
      ) : null}
    </div>
  );
}
