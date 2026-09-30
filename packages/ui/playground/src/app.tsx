import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { locales } from "@joymusic/shared";
import type { Locale } from "@joymusic/shared";
import { Chip, Switch, TooltipProvider, Toaster, applyTheme, isThemeId, themeIds } from "../../src";
import type { ThemeId } from "../../src";
import { PlaygroundContext } from "./context";
import { Gallery } from "./gallery";
import { AdminDashboard } from "./mockups/admin-dashboard";
import { DjConsole } from "./mockups/dj-console";
import { GuestNowPlaying } from "./mockups/guest-now-playing";
import { GuestSearch } from "./mockups/guest-search";
import { TvScreen } from "./mockups/tv-screen";

interface ViewDefinition {
  id: string;
  label: string;
  width?: number;
  render: () => ReactNode;
}

export const views: ViewDefinition[] = [
  { id: "gallery", label: "Components", render: () => <Gallery /> },
  { id: "guest-now", label: "Guest now playing", width: 390, render: () => <GuestNowPlaying /> },
  { id: "guest-search", label: "Guest search", width: 390, render: () => <GuestSearch /> },
  { id: "tv", label: "TV 1920", width: 1920, render: () => <TvScreen /> },
  { id: "dj", label: "DJ console", width: 1440, render: () => <DjConsole /> },
  { id: "admin", label: "Admin", width: 1440, render: () => <AdminDashboard /> },
];

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get("theme");
  const langParam = params.get("lang");
  return {
    theme: isThemeId(themeParam) ? themeParam : ("club" as ThemeId),
    lang: (locales as readonly string[]).includes(langParam ?? "")
      ? (langParam as Locale)
      : ("uz" as Locale),
    view: params.get("view") ?? "gallery",
    bare: params.get("bare") === "1",
    photo: params.get("photo") === "1",
  };
}

function useFitScale(width: number | undefined, enabled: boolean) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!enabled || !width) {
      setScale(1);
      return undefined;
    }
    const update = () => setScale(Math.min(1, (window.innerWidth - 48) / width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, enabled]);
  return scale;
}

export function App() {
  const initial = useMemo(readParams, []);
  const [theme, setTheme] = useState<ThemeId>(initial.theme);
  const [lang, setLang] = useState<Locale>(initial.lang);
  const [view, setView] = useState(initial.view);
  const [photo, setPhoto] = useState(initial.photo);
  const bare = initial.bare;

  useEffect(() => {
    applyTheme(theme);
    document.documentElement.lang = lang;
    const params = new URLSearchParams(window.location.search);
    params.set("theme", theme);
    params.set("lang", lang);
    params.set("view", view);
    params.set("photo", photo ? "1" : "0");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [theme, lang, view, photo]);

  const current = views.find((entry) => entry.id === view) ?? views[0];
  const scale = useFitScale(current?.width, !bare);
  const state = useMemo(() => ({ theme, lang, photo }), [theme, lang, photo]);
  const select = useCallback((id: string) => setView(id), []);

  if (!current) return null;

  const body = current.render();

  if (bare) {
    return (
      <PlaygroundContext.Provider value={state}>
        <TooltipProvider>
          <Toaster>{body}</Toaster>
        </TooltipProvider>
      </PlaygroundContext.Provider>
    );
  }

  const isMockup = current.id !== "gallery";

  return (
    <PlaygroundContext.Provider value={state}>
      <TooltipProvider>
        <Toaster>
          <div className="min-h-dvh bg-canvas text-fg">
            <header className="jm-glass sticky top-0 z-header flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
              <nav aria-label="Views" className="flex flex-wrap gap-1.5">
                {views.map((entry) => (
                  <Chip
                    key={entry.id}
                    size="sm"
                    selected={entry.id === view}
                    onClick={() => select(entry.id)}
                  >
                    {entry.label}
                  </Chip>
                ))}
              </nav>
              <div className="flex items-center gap-1.5" role="group" aria-label="Theme">
                {themeIds.map((id) => (
                  <Chip
                    key={id}
                    size="sm"
                    tone="brand"
                    selected={id === theme}
                    onClick={() => setTheme(id)}
                  >
                    {id}
                  </Chip>
                ))}
              </div>
              <div className="flex items-center gap-1.5" role="group" aria-label="Language">
                {locales.map((id) => (
                  <Chip
                    key={id}
                    size="sm"
                    tone="outline"
                    selected={id === lang}
                    onClick={() => setLang(id)}
                  >
                    {id.toUpperCase()}
                  </Chip>
                ))}
              </div>
              <Switch checked={photo} onCheckedChange={setPhoto} label="Photo artwork" />
            </header>
            {isMockup ? (
              <div className="flex justify-center overflow-hidden px-6 py-8">
                <div style={{ zoom: scale, width: current.width }}>{body}</div>
              </div>
            ) : (
              body
            )}
          </div>
        </Toaster>
      </TooltipProvider>
    </PlaygroundContext.Provider>
  );
}
