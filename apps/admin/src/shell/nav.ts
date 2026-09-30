import {
  CreditCard,
  Disc3,
  LayoutDashboard,
  LineChart,
  ListMusic,
  Palette,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MessageKey } from "../i18n";

export type NavGroup = "operate" | "insight" | "account";

export interface NavItem {
  id: string;
  to: string;
  icon: LucideIcon;
  label: MessageKey;
  group: NavGroup;
  chord: string;
  exact?: boolean;
}

export const navItems: readonly NavItem[] = [
  {
    id: "overview",
    to: "/",
    icon: LayoutDashboard,
    label: "nav.overview",
    group: "operate",
    chord: "o",
    exact: true,
  },
  { id: "venues", to: "/venues", icon: Store, label: "nav.venues", group: "operate", chord: "v" },
  { id: "qr", to: "/qr", icon: QrCode, label: "nav.qr", group: "operate", chord: "q" },
  { id: "djs", to: "/djs", icon: Disc3, label: "nav.djs", group: "operate", chord: "d" },
  {
    id: "sessions",
    to: "/sessions",
    icon: ListMusic,
    label: "nav.sessions",
    group: "operate",
    chord: "s",
  },
  {
    id: "moderation",
    to: "/moderation",
    icon: ShieldCheck,
    label: "nav.moderation",
    group: "operate",
    chord: "m",
  },
  {
    id: "analytics",
    to: "/analytics",
    icon: LineChart,
    label: "nav.analytics",
    group: "insight",
    chord: "a",
  },
  {
    id: "branding",
    to: "/branding",
    icon: Palette,
    label: "nav.branding",
    group: "insight",
    chord: "b",
  },
  {
    id: "billing",
    to: "/billing",
    icon: CreditCard,
    label: "nav.billing",
    group: "account",
    chord: "i",
  },
  { id: "audit", to: "/audit", icon: ScrollText, label: "nav.audit", group: "account", chord: "l" },
  {
    id: "settings",
    to: "/settings",
    icon: Settings,
    label: "nav.settings",
    group: "account",
    chord: ",",
  },
];

export const navGroups: readonly { id: NavGroup; label: MessageKey }[] = [
  { id: "operate", label: "nav.group.operate" },
  { id: "insight", label: "nav.group.insight" },
  { id: "account", label: "nav.group.account" },
];

export function isActivePath(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
