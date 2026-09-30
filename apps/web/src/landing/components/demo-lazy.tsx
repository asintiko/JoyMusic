"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { DemoCopy } from "../types";

const DemoPhone = dynamic(() => import("./demo-phone"), { ssr: false });

export function DemoLazy({ copy, label }: { copy: DemoCopy; label: string }) {
  const [ready, setReady] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={holder}
      role="group"
      aria-label={label}
      className="flex min-h-[41.5rem] flex-col items-center"
    >
      {ready ? (
        <DemoPhone copy={copy} />
      ) : (
        <div className="lp-mini-phone w-[17.5rem]" data-theme="club" aria-hidden="true">
          <div className="lp-mini-screen h-[34.5rem]" />
        </div>
      )}
    </div>
  );
}
