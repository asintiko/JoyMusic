import { useNavigate } from "@tanstack/react-router";
import { CommandPalette, type CommandItem } from "@joymusic/ui";
import { locales, type Locale } from "@joymusic/shared";
import { Languages, LogOut, Plus, QrCode, ShieldCheck, Store, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "../i18n";
import { session } from "../lib/api";
import { useVenueScope } from "../lib/venue-scope";
import { navItems } from "./nav";

const languageNames: Record<Locale, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, setLocale } = useI18n();
  const navigate = useNavigate();
  const scope = useVenueScope();

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    const go = (to: string, search?: Record<string, unknown>) => () => {
      void navigate({ to, search } as never);
    };
    list.push(
      {
        id: "action-new-venue",
        label: t("venues.new"),
        group: t("palette.actions"),
        icon: <Plus aria-hidden="true" />,
        keywords: ["create", "add", "venue", "заведение", "joy"],
        onSelect: go("/venues/new"),
      },
      {
        id: "action-new-qr",
        label: t("qr.newCode"),
        group: t("palette.actions"),
        icon: <QrCode aria-hidden="true" />,
        keywords: ["qr", "table", "стол"],
        onSelect: go("/qr", { new: 1 }),
      },
      {
        id: "action-invite",
        label: t("team.invite"),
        group: t("palette.actions"),
        icon: <UserPlus aria-hidden="true" />,
        keywords: ["dj", "invite", "диджей"],
        onSelect: go("/djs", { invite: 1 }),
      },
      {
        id: "action-word",
        label: t("moderation.addWord"),
        group: t("palette.actions"),
        icon: <ShieldCheck aria-hidden="true" />,
        keywords: ["ban", "word", "мат"],
        onSelect: go("/moderation", { focus: "word" }),
      },
    );
    navItems.forEach((item) => {
      const Icon = item.icon;
      list.push({
        id: `nav-${item.id}`,
        label: t(item.label),
        group: t("palette.navigate"),
        icon: <Icon aria-hidden="true" />,
        shortcut: (
          <span className="type-mono text-[11px] text-fg-subtle">G {item.chord.toUpperCase()}</span>
        ),
        onSelect: go(item.to),
      });
    });
    scope.venues.forEach((venue) => {
      list.push({
        id: `venue-${venue.id}`,
        label: venue.name,
        group: t("palette.venues"),
        icon: <Store aria-hidden="true" />,
        hint: venue.city ?? venue.slug,
        keywords: [venue.slug],
        onSelect: () => void navigate({ to: "/venues/$venueId", params: { venueId: venue.id } }),
      });
    });
    locales.forEach((code) => {
      list.push({
        id: `lang-${code}`,
        label: languageNames[code],
        group: t("palette.language"),
        icon: <Languages aria-hidden="true" />,
        keywords: ["language", "язык", "til", code],
        onSelect: () => setLocale(code),
      });
    });
    list.push({
      id: "logout",
      label: t("auth.logout"),
      group: t("palette.account"),
      icon: <LogOut aria-hidden="true" />,
      keywords: ["exit", "sign out", "выйти", "chiqish"],
      onSelect: () => void session.signOut().then(() => navigate({ to: "/login" })),
    });
    return list;
  }, [t, navigate, scope.venues, setLocale]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      title={t("palette.title")}
      placeholder={t("palette.placeholder")}
      emptyLabel={t("palette.empty")}
      footerHint={{
        navigate: t("palette.navigateHint"),
        select: t("palette.selectHint"),
        close: t("palette.closeHint"),
      }}
    />
  );
}
