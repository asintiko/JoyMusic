import { QrCode } from "lucide-react";
import { resolveRequestLocale } from "@/lib/server";
import { messages } from "@/lib/messages";

export default async function VenueNotFound() {
  const locale = await resolveRequestLocale("uz");
  const t = messages[locale];
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="inline-flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
        <QrCode aria-hidden="true" className="size-9" />
      </span>
      <div>
        <h1 className="type-title-lg">{t.venueNotFoundTitle}</h1>
        <p className="type-body mt-2 text-fg-muted">{t.venueNotFoundText}</p>
      </div>
    </main>
  );
}
