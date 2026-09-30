import { Apple, Command, ListMusic, Monitor, SlidersHorizontal } from "lucide-react";
import type { Locale } from "@joymusic/shared";
import { landingConfig } from "../config";
import { landingCopy } from "../copy";
import { reveal } from "../reveal";
import { Shot } from "./shot";

const pointIcons = [ListMusic, SlidersHorizontal, Command];

export function Djs({ locale }: { locale: Locale }) {
  const copy = landingCopy[locale].djs;
  const { downloadReady, downloadUrl } = landingConfig;
  const soonId = "download-soon-note";
  return (
    <section id="djs" className="lp-section" aria-labelledby="djs-title">
      <div
        className="lp-glow-orb -z-[1] right-[-12%] top-[18%] h-[30rem] w-[30rem] bg-[#ff4fd8]"
        style={{ opacity: 0.3 }}
        aria-hidden="true"
      />
      <div className="lp-container">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-16">
          <div>
            <div {...reveal()}>
              <p className="lp-eyebrow m-0">{copy.eyebrow}</p>
              <h2 id="djs-title" className="lp-headline mb-0 mt-5">
                {copy.title}
              </h2>
              <p className="lp-lead mb-0 mt-5">{copy.sub}</p>
            </div>
            <ul className="m-0 mt-9 flex list-none flex-col gap-6 p-0">
              {copy.points.map((point, index) => {
                const Icon = pointIcons[index] ?? ListMusic;
                return (
                  <li key={point.title} className="flex gap-4" {...reveal(index)}>
                    <span className="lp-icon-tile shrink-0">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="m-0 text-[18px] font-extrabold tracking-[-0.01em]">
                        {point.title}
                      </h3>
                      <p className="m-0 mt-1 text-[15px] leading-relaxed text-fg-muted">
                        {point.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <figure className="m-0" {...reveal(1)}>
            <div className="lp-frame lg:[transform:perspective(1800px)_rotateY(-6deg)_rotateX(2deg)]">
              <div className="lp-frame-bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <Shot
                name={`console-${locale}`}
                alt={copy.consoleAlt}
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 720px, 92vw"
              />
            </div>
            <figcaption className="mt-4 text-[14px] font-bold">{copy.consoleCaption}</figcaption>
          </figure>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 lg:mt-24 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="lp-card p-6 sm:p-8" {...reveal()}>
            <h3 className="m-0 font-display text-[1.25rem] font-semibold tracking-[-0.02em]">
              {copy.detectTitle}
            </h3>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[1.35fr_1fr]">
              <div>
                <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-playing-fg">
                  <span className="lp-live-dot" aria-hidden="true" />
                  {copy.autoLabel}
                </p>
                <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                  {copy.auto.map((item) => (
                    <li key={item.name} className="flex gap-3 text-[15px]">
                      <span className="lp-detect-dot bg-playing" aria-hidden="true" />
                      <span>
                        <strong className="font-extrabold">{item.name}</strong>
                        <span className="text-fg-muted"> · {item.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-next-fg">
                  <span className="lp-detect-dot mt-0 bg-next" aria-hidden="true" />
                  {copy.manualLabel}
                </p>
                <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                  {copy.manual.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] text-fg-muted">
                      <span className="lp-detect-dot bg-next" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="m-0 mt-7 border-t border-white/[0.08] pt-5 text-[13px] leading-relaxed text-fg-subtle">
              {copy.detectNote}
            </p>
          </div>

          <div className="lp-card flex flex-col gap-8 p-6 sm:p-8" {...reveal(1)}>
            <div>
              <h3 className="m-0 font-display text-[1.25rem] font-semibold tracking-[-0.02em]">
                {copy.downloadTitle}
              </h3>
              <p id={soonId} className="m-0 mt-3 text-[14px] leading-relaxed text-fg-muted">
                {downloadReady ? copy.readyNote : copy.soonNote}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { key: "mac", label: copy.mac, Icon: Apple },
                { key: "windows", label: copy.windows, Icon: Monitor },
              ].map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={downloadUrl}
                  data-platform={key}
                  data-ready={downloadReady}
                  aria-describedby={downloadReady ? undefined : soonId}
                  className="lp-btn lp-btn-ghost lp-btn-lg w-full justify-between no-underline"
                  rel="noopener"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon size={19} aria-hidden="true" />
                    {label}
                  </span>
                  {downloadReady ? null : (
                    <span className="rounded-full bg-next-soft px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-next-fg">
                      {copy.soon}
                    </span>
                  )}
                </a>
              ))}
            </div>
            {downloadReady ? (
              <p className="m-0 text-[13px] text-fg-subtle">{copy.readyNote}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
