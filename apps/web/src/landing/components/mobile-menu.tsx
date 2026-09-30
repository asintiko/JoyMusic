"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface MenuLink {
  href: string;
  label: string;
}

export function MobileMenu({
  links,
  openLabel,
  closeLabel,
  cta,
}: {
  links: MenuLink[];
  openLabel: string;
  closeLabel: string;
  cta: MenuLink;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-fg"
        style={{ boxShadow: "inset 0 0 0 1px var(--jm-line-strong)" }}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-t border-white/[0.06] bg-[#0a0812]/95 px-5 pb-6 pt-3 backdrop-blur-xl"
      >
        <ul className="m-0 flex list-none flex-col p-0">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-white/[0.06] text-[17px] font-bold text-fg no-underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={cta.href}
          className="lp-btn lp-btn-primary mt-5 w-full no-underline"
          onClick={() => setOpen(false)}
        >
          {cta.label}
        </a>
      </div>
    </div>
  );
}
