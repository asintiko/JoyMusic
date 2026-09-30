import { Check, Search } from "lucide-react";
import type { CSSProperties } from "react";
import type { Locale } from "@joymusic/shared";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";
import { StepsLine } from "./steps-line";

const qrPattern = [
  1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
];

function ScanVisual() {
  return (
    <div className="lp-step-visual" aria-hidden="true">
      <div className="lp-scan-frame">
        <i />
        <i />
        <i />
        <i />
        <div className="lp-qr-dots">
          {qrPattern.slice(0, 49).map((on, index) => (
            <span key={index} data-off={on ? undefined : ""} />
          ))}
        </div>
        <span className="lp-scan-line" />
      </div>
    </div>
  );
}

function ChooseVisual() {
  return (
    <div className="lp-step-visual" aria-hidden="true">
      <div
        className="absolute inset-x-5 top-5 flex h-10 items-center gap-2 rounded-full bg-surface-3 px-3.5 text-[13px] font-bold"
        style={{ boxShadow: "inset 0 0 0 1px var(--jm-focus)" }}
      >
        <Search size={15} className="text-fg-muted" />
        atlas
        <span className="lp-caret" />
      </div>
      {[0, 1].map((row) => (
        <div
          key={row}
          className="absolute inset-x-5 flex items-center gap-2.5"
          style={{ top: `${4.6 + row * 2.3}rem` }}
        >
          <span
            className="size-7 rounded-md"
            style={{
              background: row
                ? "linear-gradient(135deg,#ff4fd8,#7a5cff)"
                : "linear-gradient(135deg,#7a5cff,#3b2a8f)",
            }}
          />
          <span className="flex-1">
            <span
              className="block h-2 rounded bg-white/25"
              style={{ width: row ? "52%" : "68%" }}
            />
            <span
              className="mt-1.5 block h-1.5 rounded bg-white/12"
              style={{ width: row ? "34%" : "42%" }}
            />
          </span>
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-gradient-strong text-[13px] font-extrabold text-on-brand">
            +
          </span>
        </div>
      ))}
    </div>
  );
}

function DanceVisual() {
  const heights = [0.5, 0.85, 0.65, 1, 0.55, 0.9, 0.7, 0.4, 0.95, 0.6, 0.8, 0.45];
  return (
    <div className="lp-step-visual" aria-hidden="true">
      <div className="lp-floor" />
      <div className="absolute inset-x-6 bottom-4 flex h-20 items-end justify-between gap-1.5">
        {heights.map((height, index) => (
          <span
            key={index}
            className="lp-bars block flex-1"
            style={{ height: `${height * 100}%`, alignItems: "stretch" }}
          >
            <span
              style={
                {
                  width: "100%",
                  "--d": `${520 + ((index * 137) % 420)}ms`,
                  "--s": `${index * 60}ms`,
                  background:
                    index % 3 === 0
                      ? "var(--jm-playing)"
                      : "linear-gradient(180deg,#ff4fd8,#7a5cff)",
                } as CSSProperties
              }
            />
          </span>
        ))}
      </div>
      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-playing-soft px-2.5 py-1 text-[11px] font-extrabold text-playing-fg">
        <Check size={12} />
        <span className="lp-live-dot" />
      </span>
    </div>
  );
}

const visuals = [ScanVisual, ChooseVisual, DanceVisual];

export function HowItWorks({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].how;
  return (
    <section id="how" className="lp-section" aria-labelledby="how-title">
      <div className="lp-container">
        <div className="max-w-[42rem]" {...reveal()}>
          <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
          <h2 id="how-title" className="lp-headline mb-0 mt-5">
            {copy.title}
          </h2>
          <p className="lp-lead mb-0 mt-5">{copy.sub}</p>
        </div>
        <div id="how-steps" className="relative mt-14 md:mt-20">
          <StepsLine containerId="how-steps" />
          <ol className="m-0 grid list-none gap-6 p-0 pt-0 md:grid-cols-3 md:gap-8 md:pt-10">
            {copy.steps.map((step, index) => {
              const Visual = visuals[index] ?? ScanVisual;
              return (
                <li
                  key={step.tag}
                  data-step=""
                  data-active="false"
                  className="group"
                  {...reveal(index)}
                >
                  <div className="lp-card h-full p-5 transition-colors md:p-6">
                    <Visual />
                    <p className="lp-step-num m-0 mt-6 opacity-60 transition-opacity group-data-[active=true]:opacity-100">
                      {step.tag}
                    </p>
                    <h3 className="m-0 mt-2 font-display text-[1.5rem] font-semibold tracking-[-0.025em]">
                      {step.title}
                    </h3>
                    <p className="m-0 mt-3 text-[16px] leading-relaxed text-fg-muted">
                      {step.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
