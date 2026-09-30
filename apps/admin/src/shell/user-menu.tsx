import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Avatar } from "@joymusic/ui";
import { useI18n } from "../i18n";
import { session } from "../lib/api";
import { useSession } from "../lib/use-session";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "../components/menu";

export function UserMenu({ variant }: { variant: "sidebar" | "topbar" }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const state = useSession();
  const user = state.me?.user;
  if (!user) return null;
  return (
    <Menu>
      <MenuTrigger
        aria-label={t("shell.account")}
        className={
          variant === "sidebar"
            ? "focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2 max-[1179px]:justify-center"
            : "focus-ring rounded-full"
        }
      >
        <Avatar
          name={user.name}
          src={user.avatarUrl}
          size={variant === "sidebar" ? 32 : 30}
          status={variant === "sidebar" ? "online" : undefined}
        />
        {variant === "sidebar" ? (
          <span className="min-w-0 leading-tight max-[1179px]:hidden">
            <span className="block truncate text-[12.5px] font-bold">{user.name}</span>
            <span className="block truncate text-[11px] text-fg-subtle">
              {state.role ? t(`role.${state.role}`) : user.email}
            </span>
          </span>
        ) : null}
      </MenuTrigger>
      <MenuContent
        align={variant === "sidebar" ? "start" : "end"}
        side={variant === "sidebar" ? "top" : "bottom"}
      >
        <MenuLabel>{user.email}</MenuLabel>
        <MenuItem onSelect={() => void navigate({ to: "/settings" })}>
          <Settings aria-hidden="true" />
          {t("nav.settings")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          tone="danger"
          onSelect={() => {
            void session.signOut().then(() => navigate({ to: "/login" }));
          }}
        >
          <LogOut aria-hidden="true" />
          {t("auth.logout")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
