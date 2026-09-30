import type { VenueTheme } from "@joymusic/shared";
import {
  Avatar,
  Badge,
  Cover,
  Equalizer,
  Logo,
  buttonSizeClasses,
  buttonVariantClasses,
  cx,
} from "@joymusic/ui";
import { Plus } from "lucide-react";
import { useT } from "../i18n";

export interface ThemePreviewProps {
  theme: VenueTheme;
  venueName: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  className?: string;
  compact?: boolean;
}

export function ThemePreview({
  theme,
  venueName,
  logoUrl,
  coverUrl,
  className,
  compact = false,
}: ThemePreviewProps) {
  const t = useT();
  return (
    <div
      data-theme={theme}
      data-testid={`theme-preview-${theme}`}
      className={cx(
        "relative isolate overflow-hidden rounded-xl bg-canvas text-fg shadow-[var(--jm-shadow-3)] hairline-strong",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(120% 60% at 20% 0%, color-mix(in oklab, var(--jm-ambient-1) 34%, transparent), transparent 70%), radial-gradient(90% 50% at 100% 30%, color-mix(in oklab, var(--jm-ambient-2) 22%, transparent), transparent 70%)",
        }}
      />
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-x-0 top-0 -z-10 h-24 w-full object-cover opacity-40"
        />
      ) : null}
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
        {logoUrl ? (
          <Avatar name={venueName} src={logoUrl} size={28} />
        ) : (
          <Logo variant="mark" tone="theme" height={24} />
        )}
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold">{venueName || "Joy Music"}</p>
        {compact ? null : (
          <Badge size="sm" tone="brand">
            {t(`theme.${theme}`)}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="jm-glass flex items-center gap-3 rounded-lg p-3">
          <Cover seed={`preview-${theme}`} size={compact ? 52 : 64} radius="md" shadow />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-playing-fg">
              <Equalizer bars={3} />
              {t("preview.nowPlaying")}
            </p>
            <p className="mt-1 truncate font-display text-[14px] font-bold">Oydin kecha</p>
            <p className="truncate text-[12px] text-fg-muted">Ozod &amp; Nilufar</p>
          </div>
        </div>
        {compact ? null : (
          <ul className="flex flex-col gap-1.5">
            {["Kechqurun", "Blinding Lights"].map((title, index) => (
              <li
                key={title}
                className="flex items-center gap-2.5 rounded-md bg-surface-2 px-2.5 py-2"
              >
                <span className="type-mono w-3 text-[11px] text-fg-subtle">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{title}</span>
                <span className="type-mono text-[11px] text-fg-muted">+{index === 0 ? 6 : 3}</span>
              </li>
            ))}
          </ul>
        )}
        <span
          aria-hidden="true"
          className={cx(
            "inline-flex w-full select-none items-center justify-center whitespace-nowrap font-sans font-bold",
            buttonSizeClasses.sm,
            buttonVariantClasses.primary,
          )}
        >
          <Plus className="mr-1.5 size-4" />
          {t("preview.request")}
        </span>
      </div>
    </div>
  );
}
