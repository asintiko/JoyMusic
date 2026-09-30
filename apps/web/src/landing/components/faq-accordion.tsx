"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { FaqItem } from "../types";

export function FaqAccordion({
  items,
  initialOpen = 0,
}: {
  items: FaqItem[];
  initialOpen?: number | null;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(
    () => new Set(initialOpen === null ? [] : [initialOpen]),
  );
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const toggle = (index: number) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const target =
      event.key === "ArrowDown"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowUp"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    buttons.current[target]?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = open.has(index);
        const buttonId = `${base}-q${index}`;
        const panelId = `${base}-a${index}`;
        return (
          <div key={item.question} className="lp-faq-item" data-open={isOpen}>
            <h3 className="m-0">
              <button
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className="flex min-h-16 w-full items-center justify-between gap-4 rounded-[inherit] bg-transparent px-5 py-4 text-left text-[16px] font-bold leading-snug text-fg md:px-6 md:text-[17px]"
              >
                <span>{item.question}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="shrink-0 text-brand transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="lp-faq-panel"
              data-open={isOpen}
            >
              <div>
                <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-fg-muted md:px-6 md:text-[16px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
