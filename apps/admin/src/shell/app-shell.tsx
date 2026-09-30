import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCommandPalette } from "@joymusic/ui";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "../components/error-boundary";
import { useT } from "../i18n";
import { can } from "../lib/permissions";
import { useSession } from "../lib/use-session";
import { VenueScopeProvider } from "../lib/venue-scope";
import { CommandMenu } from "./command-menu";
import { navItems } from "./nav";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useChord, useSingleKey } from "./use-chord";

function ShellFrame() {
  const t = useT();
  const navigate = useNavigate();
  const palette = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const role = useSession().role;

  useEffect(() => {
    if (!can(role, "use-admin-panel")) void navigate({ to: "/dj" });
  }, [role, navigate]);

  const chords = Object.fromEntries(
    navItems.map((item) => [item.chord, () => void navigate({ to: item.to })]),
  );
  useChord("g", chords);
  useSingleKey("?", () => setShortcutsOpen(true));

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-toast focus:rounded-md focus:bg-surface-4 focus:px-3 focus:py-2"
      >
        {t("shell.skipToContent")}
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenPalette={() => palette.setOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
        <main id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-6">
            <ErrorBoundary
              resetKey={pathname}
              title={t("error.boundary.title")}
              description={t("error.boundary.description")}
              retryLabel={t("common.retry")}
            >
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandMenu open={palette.open} onOpenChange={palette.setOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

export function AppShell() {
  return (
    <VenueScopeProvider>
      <ShellFrame />
    </VenueScopeProvider>
  );
}
