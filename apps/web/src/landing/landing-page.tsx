import type { Locale } from "@joymusic/shared";
import { landingCopy } from "./copy";
import { Closing } from "./components/closing";
import { Contact } from "./components/contact";
import { DemoSection } from "./components/demo-section";
import { Djs } from "./components/djs";
import { Faq } from "./components/faq";
import { Hero } from "./components/hero";
import { HowItWorks } from "./components/how-it-works";
import { Privacy } from "./components/privacy";
import { RevealObserver } from "./components/reveal-observer";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { Themes } from "./components/themes";
import { Venues } from "./components/venues";
import { preferredLocaleApplies, preferredLocaleScript } from "./preferred-locale";

export function LandingPage({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale];
  return (
    <div className="lp">
      {preferredLocaleApplies(locale) ? (
        <script dangerouslySetInnerHTML={{ __html: preferredLocaleScript }} />
      ) : null}
      <a href="#main" className="lp-skip">
        {copy.skip}
      </a>
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero locale={locale} />
        <HowItWorks locale={locale} />
        <DemoSection locale={locale} />
        <Venues locale={locale} />
        <Djs locale={locale} />
        <Themes locale={locale} />
        <Privacy locale={locale} />
        <Faq locale={locale} />
        <Contact locale={locale} />
        <Closing locale={locale} />
      </main>
      <SiteFooter locale={locale} />
      <RevealObserver />
    </div>
  );
}
