import { useEffect } from "react";
import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import { Spinner, Toaster, TooltipProvider } from "@joymusic/ui";
import { getBridge } from "./bridge/access";
import { ConsoleScreen } from "./features/console/console-screen";
import { LoginScreen } from "./features/login/login-screen";
import { SettingsScreen } from "./features/settings/settings-screen";
import { StageScreen } from "./features/stage/stage-screen";
import { VenuePicker } from "./features/venues/venue-picker";
import { LocaleProvider, useT } from "./i18n";
import { useTopic, useTopicLoaded } from "./lib/topics";
import { MidiProvider } from "./state/midi";
import { useMenuCommands } from "./state/menu";

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center bg-canvas text-fg-muted">
      <Spinner size={28} />
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const auth = useTopic("auth");
  const loaded = useTopicLoaded("auth");
  const location = useLocation();
  if (!loaded || !auth.restored) return <Splash />;
  if (auth.status === "signedOut" && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function GlobalMenu() {
  const navigate = useNavigate();
  const settings = useTopic("settings");
  useMenuCommands({
    openSettings: () => navigate("/settings/general"),
    toggleBooth: () => void getBridge().settings.update({ boothMode: !settings.boothMode }),
    toggleLargeTargets: () =>
      void getBridge().settings.update({ largeTargets: !settings.largeTargets }),
    signOut: () => void getBridge().auth.logout(),
  });
  return null;
}

function Shell() {
  const t = useT();
  const auth = useTopic("auth");
  useEffect(() => {
    document.title = t.appName;
  }, [t]);
  return (
    <MidiProvider enabled={auth.status === "signedIn"}>
      <GlobalMenu />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/venues" element={<VenuePicker />} />
        <Route path="/console" element={<ConsoleScreen />} />
        <Route path="/settings/:tab?" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/console" replace />} />
      </Routes>
    </MidiProvider>
  );
}

function ConsoleRoutes() {
  const settings = useTopic("settings");
  return (
    <LocaleProvider locale={settings.locale}>
      <Toaster position="bottom">
        <TooltipProvider>
          <AuthGate>
            <Shell />
          </AuthGate>
        </TooltipProvider>
      </Toaster>
    </LocaleProvider>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/stage" element={<StageScreen />} />
        <Route path="*" element={<ConsoleRoutes />} />
      </Routes>
    </HashRouter>
  );
}
