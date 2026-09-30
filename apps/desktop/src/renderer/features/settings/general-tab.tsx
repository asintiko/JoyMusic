import { LogOut } from "lucide-react";
import { Avatar, Button, Chip, Switch } from "@joymusic/ui";
import { locales } from "@joymusic/shared";
import { getBridge } from "../../bridge/access";
import { useLocale, useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { Row, SettingsCard } from "./parts";

export function GeneralTab() {
  const t = useT();
  const locale = useLocale();
  const settings = useTopic("settings");
  const auth = useTopic("auth");
  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title={t.language} description={t.languageBody}>
        <div
          role="group"
          aria-label={t.language}
          className="flex gap-2"
          data-testid="language-group"
        >
          {locales.map((code) => (
            <Chip
              key={code}
              selected={code === locale}
              data-testid={`language-${code}`}
              onClick={() => void getBridge().settings.update({ locale: code })}
            >
              {t.languageNames[code]}
            </Chip>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard title={t.appearance}>
        <Row label={t.boothMode} description={t.boothModeBody}>
          <Switch
            checked={settings.boothMode}
            aria-label={t.boothMode}
            data-testid="booth-switch"
            onCheckedChange={(checked) => void getBridge().settings.update({ boothMode: checked })}
          />
        </Row>
        <Row label={t.largeTargets} description={t.largeTargetsBody}>
          <Switch
            checked={settings.largeTargets}
            aria-label={t.largeTargets}
            data-testid="large-switch"
            onCheckedChange={(checked) =>
              void getBridge().settings.update({ largeTargets: checked })
            }
          />
        </Row>
      </SettingsCard>
      <SettingsCard title={t.account}>
        <div className="flex items-center gap-4">
          <Avatar name={auth.me?.user.name ?? "DJ"} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{auth.me?.user.name}</p>
            <p className="truncate text-[13px] text-fg-muted">{auth.me?.user.email}</p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<LogOut aria-hidden="true" className="size-4" />}
            data-testid="settings-sign-out"
            onClick={() => void getBridge().auth.logout()}
          >
            {t.signOut}
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
