import type { Locale } from "@joymusic/shared";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";
import { FaqAccordion } from "./faq-accordion";

export function Faq({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].faq;
  return (
    <section id="faq" className="lp-section" aria-labelledby="faq-title">
      <div className="lp-container grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
        <div {...reveal()}>
          <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
          <h2 id="faq-title" className="lp-headline mb-0 mt-5">
            {copy.title}
          </h2>
        </div>
        <div {...reveal(1)}>
          <FaqAccordion items={copy.items} />
        </div>
      </div>
    </section>
  );
}
