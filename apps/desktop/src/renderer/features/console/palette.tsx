import {
  Check,
  CheckCheck,
  Globe,
  ListMusic,
  LogOut,
  Maximize,
  MonitorPlay,
  Music2,
  Power,
  Radio,
  RefreshCw,
  Settings,
  SkipForward,
  Moon,
  ToggleRight,
  X,
} from "lucide-react";
import { CommandPalette } from "@joymusic/ui";
import type { CommandItem } from "@joymusic/ui";
import { locales } from "@joymusic/shared";
import type { Locale } from "@joymusic/shared";
import { useMemo } from "react";
import { useT } from "../../i18n";
import type { ConsoleController } from "./use-console";

export interface PaletteActions {
  openSettings(tab?: string): void;
  toggleStage(): void;
  toggleBooth(): void;
  toggleLarge(): void;
  setLocale(locale: Locale): void;
  endSession(): void;
  signOut(): void;
  checkUpdates(): void;
  advanceSimulator?: () => void;
}

export interface ConsolePaletteProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  controller: ConsoleController;
  actions: PaletteActions;
  stageOpen: boolean;
}

export function ConsolePalette({
  open,
  onOpenChange,
  controller,
  actions,
  stageOpen,
}: ConsolePaletteProps) {
  const t = useT();
  const { perform } = controller;
  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: "accept",
        group: t.paletteGroups.requests,
        label: t.paletteAccept,
        icon: <Check aria-hidden="true" />,
        shortcut: "A",
        onSelect: () => perform({ type: "accept" }),
      },
      {
        id: "decline",
        group: t.paletteGroups.requests,
        label: t.paletteDecline,
        icon: <X aria-hidden="true" />,
        shortcut: "D",
        onSelect: () => perform({ type: "decline" }),
      },
      {
        id: "toggle-requests",
        group: t.paletteGroups.requests,
        label: controller.requestsOpen ? t.paletteCloseRequests : t.paletteOpenRequests,
        icon: <ToggleRight aria-hidden="true" />,
        onSelect: () => perform({ type: "toggleRequests" }),
      },
      {
        id: "play-next",
        group: t.paletteGroups.playback,
        label: t.pushToAir,
        icon: <Radio aria-hidden="true" />,
        shortcut: "Space",
        onSelect: () => perform({ type: "playNext" }),
      },
      {
        id: "mark-played",
        group: t.paletteGroups.playback,
        label: t.markPlayed,
        icon: <CheckCheck aria-hidden="true" />,
        shortcut: "P",
        onSelect: () => perform({ type: "markPlayed" }),
      },
      {
        id: "stage",
        group: t.paletteGroups.view,
        label: stageOpen ? t.stageClose : t.stageOpen,
        icon: <MonitorPlay aria-hidden="true" />,
        onSelect: actions.toggleStage,
      },
      {
        id: "booth",
        group: t.paletteGroups.view,
        label: t.boothMode,
        icon: <Moon aria-hidden="true" />,
        onSelect: actions.toggleBooth,
      },
      {
        id: "large",
        group: t.paletteGroups.view,
        label: t.largeTargets,
        icon: <Maximize aria-hidden="true" />,
        onSelect: actions.toggleLarge,
      },
      {
        id: "settings",
        group: t.paletteGroups.app,
        label: t.settings,
        icon: <Settings aria-hidden="true" />,
        onSelect: () => actions.openSettings(),
      },
      {
        id: "settings-hardware",
        group: t.paletteGroups.app,
        label: t.settingsTabs.hardware,
        icon: <Music2 aria-hidden="true" />,
        keywords: ["serato", "rekordbox", "traktor", "virtualdj", "midi"],
        onSelect: () => actions.openSettings("hardware"),
      },
      {
        id: "updates",
        group: t.paletteGroups.app,
        label: t.checkUpdates,
        icon: <RefreshCw aria-hidden="true" />,
        onSelect: actions.checkUpdates,
      },
      ...locales.map((code): CommandItem => ({
        id: `locale-${code}`,
        group: t.paletteGroups.language,
        label: t.languageNames[code],
        icon: <Globe aria-hidden="true" />,
        onSelect: () => actions.setLocale(code),
      })),
      {
        id: "end-session",
        group: t.paletteGroups.session,
        label: t.endSession,
        icon: <Power aria-hidden="true" />,
        onSelect: actions.endSession,
      },
      {
        id: "sign-out",
        group: t.paletteGroups.session,
        label: t.signOut,
        icon: <LogOut aria-hidden="true" />,
        onSelect: actions.signOut,
      },
    ];
    if (actions.advanceSimulator) {
      list.push({
        id: "simulator-next",
        group: t.paletteGroups.playback,
        label: t.simulatorNext,
        icon: <SkipForward aria-hidden="true" />,
        onSelect: actions.advanceSimulator,
      });
    }
    for (const request of controller.incoming.slice(0, 20)) {
      list.push({
        id: `jump-${request.id}`,
        group: t.paletteGroups.jump,
        label: `${request.title} - ${request.artist}`,
        hint: t.incomingTitle,
        icon: <ListMusic aria-hidden="true" />,
        keywords: [request.artist, request.title],
        onSelect: () => controller.selectIncoming(request.id),
      });
    }
    for (const request of controller.queue.slice(0, 30)) {
      list.push({
        id: `jump-${request.id}`,
        group: t.paletteGroups.jump,
        label: `${request.title} - ${request.artist}`,
        hint: t.queueTitle,
        icon: <ListMusic aria-hidden="true" />,
        keywords: [request.artist, request.title],
        onSelect: () => controller.selectQueue(request.id),
      });
    }
    return list;
  }, [t, controller, perform, actions, stageOpen]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      title={t.paletteTitle}
      placeholder={t.palettePlaceholder}
      emptyLabel={t.paletteEmpty}
      footerHint={{ navigate: t.paletteNavigate, select: t.paletteSelect, close: t.paletteClose }}
    />
  );
}
