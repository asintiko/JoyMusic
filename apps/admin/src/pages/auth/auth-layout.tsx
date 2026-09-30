import { CalendarClock, QrCode, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { AmbientBackground, Cover, Equalizer, Logo } from "@joymusic/ui";
import { LanguageSwitcher } from "../../components/language-switcher";
import { useT } from "../../i18n";

function ProductGlimpse() {
  const t = useT();
  const rows = [
    { title: "Oydin kecha", artist: "Ozod & Nilufar", votes: 12, seed: "oydin" },
    { title: "Blinding Lights", artist: "The Weeknd", votes: 9, seed: "blinding" },
    { title: "Kechqurun", artist: "Laylo", votes: 6, seed: "kechqurun" },
  ];
  return (
    <div className="jm-float relative w-full max-w-[420px]">
      <div className="jm-glass rounded-xl p-4 shadow-[var(--jm-shadow-4)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="type-eyebrow text-fg-muted">{t("authLayout.live")}</p>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-playing-fg">
            <Equalizer bars={4} />
            {t("authLayout.playing")}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li
              key={row.seed}
              className="flex items-center gap-3 rounded-md bg-surface-2/70 p-2 pr-3"
            >
              <Cover seed={row.seed} size={40} radius="sm" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-bold">{row.title}</p>
                <p className="truncate text-[12px] text-fg-muted">{row.artist}</p>
              </div>
              <span className="type-mono text-[12px] font-bold text-fg-muted">
                {index === 0 ? "▲" : ""}
                {row.votes}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-canvas min-[1000px]:grid-cols-[minmax(440px,540px)_1fr]">
      <div className="flex min-h-dvh flex-col px-6 py-6 min-[1000px]:px-14">
        <header className="flex items-center justify-between">
          <Logo variant="horizontal" height={28} />
          <LanguageSwitcher />
        </header>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="type-display-md jm-rise !text-[1.75rem]">{title}</h1>
          {subtitle ? (
            <p className="type-body jm-rise jm-rise-2 mt-2 text-fg-muted">{subtitle}</p>
          ) : null}
          <div className="jm-rise jm-rise-3 mt-8">{children}</div>
          {footer ? (
            <div className="mt-6 text-center text-[13px] text-fg-muted">{footer}</div>
          ) : null}
        </div>
        <p className="text-center text-[12px] text-fg-disabled">{t("auth.copyright")}</p>
      </div>
      <aside
        className="relative hidden overflow-hidden border-l border-[var(--jm-line)] min-[1000px]:block"
        aria-hidden="true"
      >
        <AmbientBackground colors={["#7A5CFF", "#FF4FD8", "#3B2A8F"]} intensity={1.05} />
        <div className="relative mx-auto flex h-full max-w-[560px] flex-col justify-center gap-14 px-14 py-14">
          <div className="max-w-[460px]">
            <p className="type-eyebrow text-brand">{t("authLayout.eyebrow")}</p>
            <p className="type-display-md mt-4 !text-[2.5rem]">{t("authLayout.headline")}</p>
          </div>
          <div className="flex flex-col items-start gap-10">
            <ProductGlimpse />
            <ul className="grid max-w-[520px] grid-cols-3 gap-4 text-[12.5px] text-fg-muted">
              <li className="flex flex-col gap-2">
                <QrCode aria-hidden="true" className="size-5 text-brand" />
                {t("authLayout.point1")}
              </li>
              <li className="flex flex-col gap-2">
                <Sparkles aria-hidden="true" className="size-5 text-brand" />
                {t("authLayout.point2")}
              </li>
              <li className="flex flex-col gap-2">
                <CalendarClock aria-hidden="true" className="size-5 text-brand" />
                {t("authLayout.point3")}
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
