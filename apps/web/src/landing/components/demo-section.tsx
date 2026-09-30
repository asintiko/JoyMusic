import { ScanLine } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";
import { DemoLazy } from "./demo-lazy";

export function DemoSection({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].demo;
  return (
    <section id="demo" className="lp-section" aria-labelledby="demo-title">
      <div
        className="lp-glow-orb -z-[1] left-[-10%] top-[10%] h-[28rem] w-[28rem] bg-[#7a5cff]"
        aria-hidden="true"
      />
      <div className="lp-container">
        <div
          className="lp-card overflow-hidden p-6 sm:p-10 lg:p-14"
          style={{
            background:
              "linear-gradient(160deg, rgb(122 92 255 / 0.14), rgb(255 79 216 / 0.05) 55%, rgb(255 255 255 / 0.02))",
          }}
        >
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
            <div>
              <div {...reveal()}>
                <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
                <h2 id="demo-title" className="lp-headline mb-0 mt-5">
                  {copy.title}
                </h2>
                <p className="lp-lead mb-0 mt-5 max-w-[32rem]">{copy.sub}</p>
              </div>
              <figure
                className="m-0 mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center"
                {...reveal(1)}
              >
                <div className="relative shrink-0 rounded-[1.5rem] bg-white p-4 shadow-[0_0_0_1px_rgb(255_255_255/0.2),0_30px_80px_-20px_rgb(122_92_255/0.7)]">
                  <img
                    src="/demo-qr.svg"
                    alt={copy.qrLabel}
                    width={216}
                    height={216}
                    className="size-[13.5rem] sm:size-[13.5rem]"
                    data-testid="demo-qr"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="text-[14px] leading-relaxed text-fg-muted">
                  <span className="flex items-center gap-2 font-bold text-fg">
                    <ScanLine size={18} aria-hidden="true" className="text-brand" />
                    {copy.qrCaption}
                  </span>
                  <span className="mt-3 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
                    {copy.urlLabel}
                  </span>
                  <code className="mt-1 block break-all font-sans tabular-nums text-[13px] font-semibold text-fg">
                    {landingConfig.demoUrl}
                  </code>
                </figcaption>
              </figure>
              <p className="m-0 mt-8 max-w-[32rem] text-[13px] leading-relaxed text-fg-subtle">
                {copy.disclaimer}
              </p>
            </div>
            <div {...reveal(2)}>
              <DemoLazy copy={copy.copy} label={copy.phoneLabel} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
