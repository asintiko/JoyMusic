import { ArrowRight } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { placeholderUri } from "../images";
import { reveal } from "../reveal";

export function Closing({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].closing;
  const placeholder = placeholderUri("hero-phone-table");
  return (
    <section className="lp-section pt-4 lg:pt-8" aria-labelledby="closing-title">
      <div className="lp-container">
        <div className="lp-closing" {...reveal()}>
          <div className="lp-ikat absolute inset-0 opacity-[0.12]" aria-hidden="true" />
          <div className="relative grid grid-cols-1 items-center gap-10 p-7 sm:p-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:p-16">
            <div>
              <h2
                id="closing-title"
                className="lp-headline m-0 text-[clamp(2rem,1.3rem+3.4vw,3.75rem)]"
              >
                {copy.title}
              </h2>
              <p className="lp-lead mb-0 mt-5 max-w-[30rem] text-fg">{copy.text}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={landingConfig.adminUrl}
                  className="lp-btn lp-btn-primary lp-btn-lg no-underline"
                >
                  {copy.primary}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a href="#contact" className="lp-btn lp-btn-ghost lp-btn-lg no-underline">
                  {copy.secondary}
                </a>
              </div>
            </div>
            <div
              className="relative hidden aspect-[4/5] overflow-hidden rounded-[1.5rem] lg:block"
              style={{
                backgroundImage: placeholder ? `url(${placeholder})` : undefined,
                backgroundSize: "cover",
                boxShadow: "0 0 0 1px rgb(255 255 255 / 0.14), 0 40px 80px -30px rgb(0 0 0 / 0.8)",
              }}
              aria-hidden="true"
            >
              <img
                src="/landing/hero-phone-table-720.webp"
                width={720}
                height={900}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
