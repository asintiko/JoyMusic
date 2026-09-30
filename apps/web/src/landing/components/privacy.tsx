import { Globe, Smartphone, UserRoundX, Zap } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";

const icons = [UserRoundX, Zap, Smartphone, Globe];

const microcopy = [
  { code: "uz", text: "Hozir chalinmoqda" },
  { code: "ru", text: "Играет сейчас" },
  { code: "en", text: "Now playing" },
];

export function Privacy({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].privacy;
  return (
    <section id="guests" className="lp-section" aria-labelledby="guests-title">
      <div className="lp-container">
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-[44rem]" {...reveal()}>
            <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
            <h2 id="guests-title" className="lp-headline mb-0 mt-5">
              {copy.title}
            </h2>
            <p className="lp-lead mb-0 mt-5 max-w-[36rem]">{copy.sub}</p>
          </div>
          <ul
            className="m-0 flex list-none flex-wrap gap-2 p-0 lg:justify-end"
            aria-hidden="true"
            {...reveal(1)}
          >
            {microcopy.map((item) => (
              <li key={item.code} className="lp-chip" lang={item.code}>
                <span className="font-extrabold uppercase text-brand">{item.code}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <ul className="m-0 mt-12 grid list-none gap-4 p-0 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {copy.cards.map((card, index) => {
            const Icon = icons[index] ?? Globe;
            return (
              <li key={card.title} className="lp-card p-6" {...reveal(index)}>
                <span className="lp-icon-tile">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="m-0 mt-5 text-[19px] font-extrabold leading-tight tracking-[-0.015em]">
                  {card.title}
                </h3>
                <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-fg-muted">{card.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
