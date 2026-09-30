import { buildLogoSvg } from "@joymusic/brand";
import { resolveRequestLocale } from "@/lib/server";
import { messages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await resolveRequestLocale("uz");
  const t = messages[locale];
  const logo = buildLogoSvg({ variant: "lockup-stacked", tone: "gradient", height: 168 });
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-8 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_20%,color-mix(in_oklab,var(--jm-brand-from)_35%,transparent),transparent_60%)]"
      />
      <div role="img" aria-label="Joy Music" dangerouslySetInnerHTML={{ __html: logo }} />
      <div className="max-w-[520px]">
        <h1 className="type-display-md">{t.homeTitle}</h1>
        <p className="type-body-lg mt-3 text-fg-muted">{t.homeText}</p>
        <p className="type-eyebrow mt-6 text-fg-subtle">{t.homeHint}</p>
      </div>
    </main>
  );
}
