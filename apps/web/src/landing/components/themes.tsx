import type { Locale } from "@joymusic/shared";
import { landingCopy } from "../copy";
import { placeholderUri } from "../images";
import { reveal } from "../reveal";
import { ThemesShowcase } from "./themes-showcase";

export function Themes({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].themes;
  const placeholders = {
    club: placeholderUri("hero-landing"),
    lounge: placeholderUri("backdrop-lounge"),
    cafe: placeholderUri("backdrop-cafe"),
  };
  return (
    <section id="themes" className="lp-section" aria-labelledby="themes-title">
      <div className="lp-container">
        <div className="max-w-[42rem]" {...reveal()}>
          <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
          <h2 id="themes-title" className="lp-headline mb-0 mt-5">
            {copy.title}
          </h2>
          <p className="lp-lead mb-0 mt-5">{copy.sub}</p>
        </div>
        <div className="mt-12 lg:mt-16" {...reveal(1)}>
          <ThemesShowcase copy={copy} placeholders={placeholders} />
        </div>
      </div>
    </section>
  );
}
