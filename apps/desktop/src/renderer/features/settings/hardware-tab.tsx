import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { FolderOpen, SkipForward } from "lucide-react";
import { Badge, Button, Input, Switch } from "@joymusic/ui";
import type { BadgeTone } from "@joymusic/ui";
import type { AdapterState } from "@joymusic/dj-bridge";
import { defaultTextTemplate, defaultTraktorPort } from "../../../common/settings";
import type { AdapterId, AdapterSettings, SettingsPatch } from "../../../common/settings";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { SettingsCard } from "./parts";

const stateTone: Record<AdapterState, BadgeTone> = {
  active: "playing",
  waiting: "next",
  starting: "next",
  unavailable: "neutral",
  error: "danger",
  stopped: "neutral",
};

function CommitInput({
  value,
  onCommit,
  ...rest
}: {
  value: string;
  onCommit(value: string): void;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  trailing?: ReactNode;
  "data-testid"?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <Input
      {...rest}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
    />
  );
}

async function update(patch: SettingsPatch) {
  await getBridge().settings.update(patch);
}

function StatusBadge({ id }: { id: AdapterId }) {
  const t = useT();
  const adapters = useTopic("adapters");
  const entry = adapters.adapters.find((adapter) => adapter.id === id);
  if (!entry || !entry.enabled) return <Badge size="sm">{t.adapterStates.stopped}</Badge>;
  return (
    <Badge size="sm" tone={stateTone[entry.status.state]} dot data-testid={`status-${id}`}>
      {t.adapterStates[entry.status.state]}
    </Badge>
  );
}

function StatusDetail({ id }: { id: AdapterId }) {
  const adapters = useTopic("adapters");
  const entry = adapters.adapters.find((adapter) => adapter.id === id);
  if (!entry?.enabled || !entry.status.detail) return null;
  return <p className="type-mono break-all text-[12px] text-fg-subtle">{entry.status.detail}</p>;
}

function CurrentTrack({ id }: { id: AdapterId }) {
  const t = useT();
  const adapters = useTopic("adapters");
  const entry = adapters.adapters.find((adapter) => adapter.id === id);
  if (!entry?.enabled || !entry.current) return null;
  return (
    <p className="text-[13px] text-fg-muted" data-testid={`current-${id}`}>
      {t.detectedNow}:{" "}
      <span className="font-bold text-fg">
        {entry.current.artist} - {entry.current.title}
      </span>
    </p>
  );
}

function AdapterCard({
  id,
  settings,
  children,
}: {
  id: AdapterId;
  settings: AdapterSettings;
  children?: ReactNode;
}) {
  const t = useT();
  const info = t.adapterInfo[id];
  const enabled = settings[id].enabled;
  return (
    <SettingsCard
      testId={`adapter-${id}`}
      title={info.title}
      description={info.body}
      action={
        <div className="flex items-center gap-3">
          <StatusBadge id={id} />
          <Switch
            checked={enabled}
            aria-label={info.title}
            data-testid={`toggle-${id}`}
            onCheckedChange={(checked) =>
              void update({ adapters: { [id]: { enabled: checked } } as SettingsPatch["adapters"] })
            }
          />
        </div>
      }
    >
      {enabled || children ? (
        <div className="flex flex-col gap-3">
          {children}
          <StatusDetail id={id} />
          <CurrentTrack id={id} />
        </div>
      ) : null}
    </SettingsCard>
  );
}

function PickButton({ kind, onPick }: { kind: "directory" | "file"; onPick(path: string): void }) {
  const t = useT();
  return (
    <Button
      size="sm"
      variant="secondary"
      leftIcon={<FolderOpen aria-hidden="true" className="size-4" />}
      onClick={() =>
        void getBridge()
          .system.pickPath(kind)
          .then((path) => {
            if (path) onPick(path);
          })
      }
    >
      {t.choose}
    </Button>
  );
}

export function HardwareTab() {
  const t = useT();
  const settings = useTopic("settings").adapters;
  return (
    <div className="flex flex-col gap-4" data-testid="hardware-tab">
      <p className="text-[13px] text-fg-muted">{t.hardwareIntro}</p>

      <AdapterCard id="serato" settings={settings}>
        <CommitInput
          label={t.seratoFolder}
          hint={t.seratoFolderHint}
          placeholder="~/Music/_Serato_"
          value={settings.serato.directory ?? ""}
          onCommit={(value) => void update({ adapters: { serato: { directory: value || null } } })}
          trailing={
            <PickButton
              kind="directory"
              onPick={(path) => void update({ adapters: { serato: { directory: path } } })}
            />
          }
        />
      </AdapterCard>

      <AdapterCard id="virtualdj" settings={settings}>
        <CommitInput
          label={t.virtualDjFolder}
          hint={t.virtualDjFolderHint}
          value={settings.virtualdj.directory ?? ""}
          onCommit={(value) =>
            void update({ adapters: { virtualdj: { directory: value || null } } })
          }
          trailing={
            <PickButton
              kind="directory"
              onPick={(path) => void update({ adapters: { virtualdj: { directory: path } } })}
            />
          }
        />
        <CommitInput
          label={t.virtualDjFile}
          hint={t.virtualDjFileHint}
          value={settings.virtualdj.nowPlayingFile ?? ""}
          onCommit={(value) =>
            void update({ adapters: { virtualdj: { nowPlayingFile: value || null } } })
          }
          trailing={
            <PickButton
              kind="file"
              onPick={(path) => void update({ adapters: { virtualdj: { nowPlayingFile: path } } })}
            />
          }
        />
      </AdapterCard>

      <AdapterCard id="traktor" settings={settings}>
        <div className="grid grid-cols-2 gap-3">
          <CommitInput
            label={t.traktorPort}
            type="number"
            value={String(settings.traktor.port)}
            onCommit={(value) => {
              const port = Number.parseInt(value, 10);
              if (Number.isInteger(port) && port >= 1024 && port <= 65535) {
                void update({ adapters: { traktor: { port } } });
              }
            }}
            data-testid="traktor-port"
          />
          <CommitInput
            label={t.traktorPassword}
            type="password"
            value={settings.traktor.password ?? ""}
            onCommit={(value) =>
              void update({ adapters: { traktor: { password: value || null } } })
            }
          />
        </div>
        <ol
          className="list-decimal space-y-1 pl-5 text-[13px] text-fg-muted"
          data-testid="traktor-steps"
        >
          {t.traktorSteps(settings.traktor.port || defaultTraktorPort).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </AdapterCard>

      <AdapterCard id="textfile" settings={settings}>
        <CommitInput
          label={t.textFilePath}
          value={settings.textfile.path ?? ""}
          onCommit={(value) => void update({ adapters: { textfile: { path: value || null } } })}
          trailing={
            <PickButton
              kind="file"
              onPick={(path) => void update({ adapters: { textfile: { path } } })}
            />
          }
        />
        <CommitInput
          label={t.textFileTemplate}
          hint={t.textFileTemplateHint}
          value={settings.textfile.template}
          onCommit={(value) =>
            void update({
              adapters: { textfile: { template: value.trim() || defaultTextTemplate } },
            })
          }
        />
      </AdapterCard>

      <AdapterCard id="prolink" settings={settings} />
      <AdapterCard id="stagelinq" settings={settings} />

      <AdapterCard id="simulator" settings={settings}>
        <div>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<SkipForward aria-hidden="true" className="size-4" />}
            data-testid="simulator-next"
            onClick={() => void getBridge().adapters.advanceSimulator()}
          >
            {t.simulatorNext}
          </Button>
        </div>
      </AdapterCard>
    </div>
  );
}
