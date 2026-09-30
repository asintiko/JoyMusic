import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  gap?: number;
  className?: string;
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
}

export function Marquee({ children, speed = 42, gap = 48, className, as = "div" }: MarqueeProps) {
  const Tag = as;
  const containerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [duration, setDuration] = useState(14);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return undefined;
    const measure = () => {
      const contentWidth = content.scrollWidth - gap;
      const available = container.clientWidth;
      const overflowing = contentWidth > available + 1;
      setOverflow(overflowing);
      if (overflowing) setDuration(Math.max(6, (contentWidth + gap) / speed));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [children, gap, speed]);

  const style = {
    "--jm-marquee-gap": `${gap}px`,
    "--jm-marquee-duration": `${duration}s`,
  } as CSSProperties;

  return (
    <Tag
      ref={containerRef as never}
      className={cx("jm-marquee", className)}
      data-overflow={overflow}
      style={style}
    >
      <span className="jm-marquee-track">
        <span ref={contentRef} className="jm-marquee-item">
          {children}
        </span>
        {overflow ? (
          <span className="jm-marquee-item" aria-hidden="true">
            {children}
          </span>
        ) : null}
      </span>
    </Tag>
  );
}

export interface TickerProps {
  children: ReactNode;
  duration?: number;
  className?: string;
}

export function Ticker({ children, duration = 48, className }: TickerProps) {
  const style = { "--jm-ticker-duration": `${duration}s` } as CSSProperties;
  return (
    <div className={cx("overflow-hidden", className)}>
      <div className="jm-ticker-track" style={style}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
