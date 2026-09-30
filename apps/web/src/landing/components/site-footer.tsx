import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { LandingLangList } from "./lang-switch";
import { LogoInline } from "./logo-inline";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale];
  const links = [
    { href: "#how", label: copy.nav.how },
    { href: "#demo", label: copy.nav.demo },
    { href: "#venues", label: copy.nav.venues },
    { href: "#djs", label: copy.nav.djs },
    { href: "#faq", label: copy.nav.faq },
  ];
  return (
    <footer className="border-t border-white/[0.08] pb-12 pt-14">
      <div className="lp-container grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <LogoInline height={30} idPrefix="ftr" />
          <p className="m-0 mt-4 max-w-[22rem] text-[15px] leading-relaxed text-fg-muted">
            {copy.footer.tagline}
          </p>
          <p className="m-0 mt-3 text-[13px] text-fg-subtle">{copy.footer.status}</p>
        </div>
        <nav aria-label={copy.footer.product}>
          <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
            {copy.footer.product}
          </p>
          <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {links.map((link) => (
              <li key={link.href}>
                <a className="lp-footer-link" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a className="lp-footer-link" href={landingConfig.contactUrl}>
                {copy.contact.cta}
              </a>
            </li>
          </ul>
        </nav>
        <LandingLangList locale={locale} label={copy.language} />
      </div>
      <div className="lp-container mt-12">
        <p className="m-0 text-[13px] text-fg-subtle">{copy.footer.rights}</p>
      </div>
    </footer>
  );
}
