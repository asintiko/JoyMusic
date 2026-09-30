import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { placeholderUri } from "../images";
import { HeroTicker } from "./hero-ticker";
import { Shot } from "./shot";

export function Hero({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale];
  const hero = copy.hero;
  const placeholder = placeholderUri("hero-landing");
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div
        className="lp-hero-bg"
        style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
        aria-hidden="true"
      >
        <img
          src="/landing/hero-landing-960.webp"
          srcSet="/landing/hero-landing-960.webp 960w, /landing/hero-landing-1280.webp 1280w, /landing/hero-landing-2560.webp 2560w"
          sizes="(max-width: 900px) 480px, 100vw"
          width={1280}
          height={724}
          alt=""
          fetchPriority="high"
          draggable={false}
        />
      </div>
      <div className="lp-hero-shade" aria-hidden="true" />
      <div className="lp-beams" aria-hidden="true">
        <span
          className="lp-beam"
          style={
            {
              left: "6%",
              "--lp-beam-from": "-18deg",
              "--lp-beam-to": "-2deg",
              "--lp-beam-duration": "12s",
            } as CSSProperties
          }
        />
        <span
          className="lp-beam"
          data-tone="magenta"
          style={
            {
              left: "38%",
              "--lp-beam-from": "10deg",
              "--lp-beam-to": "-10deg",
              "--lp-beam-duration": "15s",
              "--lp-beam-delay": "-4s",
            } as CSSProperties
          }
        />
        <span
          className="lp-beam"
          style={
            {
              right: "4%",
              "--lp-beam-from": "16deg",
              "--lp-beam-to": "2deg",
              "--lp-beam-duration": "13s",
              "--lp-beam-delay": "-7s",
            } as CSSProperties
          }
        />
      </div>
      <div className="lp-ikat absolute inset-0 -z-[1]" aria-hidden="true" />

      <div className="lp-container relative grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
        <div className="max-w-[40rem]">
          <p className="lp-eyebrow m-0">{hero.eyebrow}</p>
          <h1
            id="hero-title"
            className="lp-headline mb-0 mt-6 text-[clamp(2.25rem,1.35rem+4.4vw,4.75rem)]"
          >
            {hero.titleLead} <span className="lp-gradient-text">{hero.titleAccent}</span>
          </h1>
          <p className="lp-lead mb-0 mt-6 max-w-[34rem]">{hero.sub}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={landingConfig.adminUrl}
              className="lp-btn lp-btn-primary lp-btn-lg no-underline"
            >
              {hero.primary}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#how" className="lp-btn lp-btn-ghost lp-btn-lg no-underline">
              {hero.secondary}
            </a>
          </div>
          <p className="m-0 mt-6 text-[14px] font-semibold text-fg-muted">{hero.note}</p>
        </div>

        <div className="lp-parallax-fg relative mx-auto w-full max-w-[22rem] lg:mx-0 lg:ml-auto">
          <div className="relative mx-auto w-[15.5rem] sm:w-[17rem]">
            <div className="lp-phone-float">
              <div className="lp-phone">
                <div className="lp-phone-island" aria-hidden="true" />
                <div className="lp-phone-screen">
                  <Shot
                    name={`guest-${locale}`}
                    alt={hero.phoneAlt}
                    width={600}
                    height={1298}
                    priority
                    sizes="272px"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-[2] -mt-[4.5rem] ml-auto w-[min(19rem,88%)] sm:-mt-24 sm:-ml-10 sm:mr-auto lg:-ml-16">
            <HeroTicker
              live={hero.live}
              nowPlaying={hero.nowPlaying}
              fromTable={hero.fromTable}
              simulated={hero.simulated}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
