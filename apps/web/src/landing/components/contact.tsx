import { Mail } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";

export function Contact({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].contact;
  return (
    <section id="contact" className="lp-section pt-4 lg:pt-8" aria-labelledby="contact-title">
      <div className="lp-container">
        <div
          className="lp-card flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-14 lg:p-12"
          {...reveal()}
        >
          <div className="max-w-[38rem]">
            <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
            <h2
              id="contact-title"
              className="lp-headline mb-0 mt-5 text-[clamp(1.625rem,1.1rem+2.4vw,2.5rem)]"
            >
              {copy.title}
            </h2>
            <p className="lp-lead mb-0 mt-4">{copy.text}</p>
            <p className="m-0 mt-5 inline-flex items-center gap-2 rounded-full bg-next-soft px-3.5 py-1.5 text-[13px] font-bold text-next-fg">
              {copy.honesty}
            </p>
          </div>
          <a
            href={landingConfig.contactUrl}
            className="lp-btn lp-btn-primary lp-btn-lg shrink-0 no-underline"
          >
            <Mail size={18} aria-hidden="true" />
            {copy.cta}
          </a>
        </div>
      </div>
    </section>
  );
}
