"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Inner = dynamic(() => import("./steps-line-inner"), { ssr: false });

export function StepsLine({ containerId }: { containerId: string }) {
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
      { rootMargin: "500px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={holder} className="lp-step-line hidden md:block" aria-hidden="true">
      {ready ? <Inner containerId={containerId} /> : <span style={{ transform: "scaleX(0)" }} />}
    </div>
  );
}
