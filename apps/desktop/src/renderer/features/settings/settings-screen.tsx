import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button, Logo, Tabs, TabsContent, TabsList, TabsTrigger } from "@joymusic/ui";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { useApplyTheme } from "../../state/appearance";
import { GeneralTab } from "./general-tab";
import { HardwareTab } from "./hardware-tab";
import { MidiTab } from "./midi-tab";
import { StageTab } from "./stage-tab";
import { UpdatesTab } from "./updates-tab";

const tabIds = ["general", "hardware", "midi", "stage", "updates"] as const;
type TabId = (typeof tabIds)[number];

function isTab(value: string | undefined): value is TabId {
  return (tabIds as readonly string[]).includes(value ?? "");
}

export function SettingsScreen() {
  const t = useT();
  const navigate = useNavigate();
  const params = useParams();
  const auth = useTopic("auth");
  const session = useTopic("session");
  useApplyTheme(session?.venueTheme ?? "club");
  if (auth.status !== "signedIn") return <Navigate to="/login" replace />;
  if (!isTab(params.tab)) return <Navigate to="/settings/general" replace />;

  return (
    <main className="flex h-dvh flex-col bg-canvas" data-testid="settings">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface-1 px-5">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
          data-testid="settings-back"
          onClick={() => navigate(session ? "/console" : "/venues")}
        >
          {t.back}
        </Button>
        <Logo variant="horizontal" height={22} />
        <h1 className="type-eyebrow text-fg">{t.settings}</h1>
      </header>
      <div className="mx-auto w-full max-w-[860px] flex-1 overflow-y-auto px-6 py-8">
        <Tabs
          value={params.tab}
          onValueChange={(value) => navigate(`/settings/${value}`, { replace: true })}
        >
          <TabsList aria-label={t.settings}>
            {tabIds.map((id) => (
              <TabsTrigger key={id} value={id} data-testid={`tab-${id}`}>
                {t.settingsTabs[id]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="general" className="pt-6">
            <GeneralTab />
          </TabsContent>
          <TabsContent value="hardware" className="pt-6">
            <HardwareTab />
          </TabsContent>
          <TabsContent value="midi" className="pt-6">
            <MidiTab />
          </TabsContent>
          <TabsContent value="stage" className="pt-6">
            <StageTab />
          </TabsContent>
          <TabsContent value="updates" className="pt-6">
            <UpdatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
