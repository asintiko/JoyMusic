"use client";

import { useEffect } from "react";

export function RevealObserver() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      for (const target of targets) target.setAttribute("data-revealed", "");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return null;
}
