import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { landingPath } from "../seo";
import { LandingLangSwitch } from "./lang-switch";
import { LogoInline } from "./logo-inline";
import { MobileMenu } from "./mobile-menu";
import type { MenuLink } from "./mobile-menu";

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale];
  const links: MenuLink[] = [
    { href: "#how", label: copy.nav.how },
    { href: "#demo", label: copy.nav.demo },
    { href: "#venues", label: copy.nav.venues },
    { href: "#djs", label: copy.nav.djs },
    { href: "#themes", label: copy.nav.themes },
    { href: "#faq", label: copy.nav.faq },
  ];
  return (
    <header className="lp-header">
      <div className="lp-container relative flex h-16 items-center justify-between gap-3">
        <a
          href={landingPath(locale)}
          aria-label={copy.brandLabel}
          className="inline-flex min-h-10 items-center rounded-lg"
        >
          <LogoInline height={30} idPrefix="hdr" />
        </a>
        <nav aria-label={copy.navLabel} className="hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="lp-nav-link">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <LandingLangSwitch locale={locale} label={copy.language} />
          <div className="hidden lg:block">
            <a
              href={landingConfig.adminUrl}
              className="lp-btn lp-btn-primary lp-btn-sm no-underline"
            >
              {copy.getStarted}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <MobileMenu
            links={links}
            openLabel={copy.openMenu}
            closeLabel={copy.closeMenu}
            cta={{ href: landingConfig.adminUrl, label: copy.getStarted }}
          />
        </div>
      </div>
    </header>
  );
}
