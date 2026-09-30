import { ChartColumn, QrCode, ShieldCheck, Tv } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";
import { Shot } from "./shot";

const icons = [QrCode, Tv, ShieldCheck, ChartColumn];

export function Venues({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].venues;
  return (
    <section id="venues" className="lp-section" aria-labelledby="venues-title">
      <div className="lp-container">
        <div className="max-w-[46rem]" {...reveal()}>
          <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
          <h2 id="venues-title" className="lp-headline mb-0 mt-5">
            {copy.title}
          </h2>
          <p className="lp-lead mb-0 mt-5 max-w-[38rem]">{copy.sub}</p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 items-start gap-8 lg:mt-20 lg:grid-cols-12 lg:gap-6">
          <figure className="m-0 lg:col-span-7" {...reveal()}>
            <div className="lp-frame">
              <div className="lp-frame-bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <Shot
                name={`admin-${locale}`}
                alt={copy.adminAlt}
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 700px, 92vw"
              />
            </div>
            <figcaption className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-bold">{copy.adminCaption}</span>
              <span className="lp-chip">{copy.demoData}</span>
            </figcaption>
          </figure>
          <figure className="m-0 lg:col-span-5 lg:mt-24" {...reveal(2)}>
            <div className="lp-tv">
              <Shot
                name={`tv-${locale}`}
                alt={copy.tvAlt}
                width={1280}
                height={720}
                sizes="(min-width: 1024px) 500px, 92vw"
              />
            </div>
            <div className="lp-tv-stand" aria-hidden="true" />
            <figcaption className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-bold">{copy.tvCaption}</span>
              <span className="lp-chip">{copy.demoData}</span>
            </figcaption>
          </figure>
        </div>

        <ul className="m-0 mt-16 grid list-none gap-4 p-0 sm:grid-cols-2 lg:mt-24 lg:grid-cols-4 lg:gap-5">
          {copy.features.map((feature, index) => {
            const Icon = icons[index] ?? QrCode;
            return (
              <li key={feature.title} className="lp-card p-6" {...reveal(index)}>
                <span className="lp-icon-tile">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="m-0 mt-5 text-[19px] font-extrabold leading-tight tracking-[-0.015em]">
                  {feature.title}
                </h3>
                <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-fg-muted">
                  {feature.text}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
