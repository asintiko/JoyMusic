export function ArtworkGlow({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <img
        src={src}
        alt=""
        width={120}
        height={120}
        decoding="async"
        className="absolute left-1/2 top-[-8%] h-[72%] w-[140%] -translate-x-1/2 object-cover opacity-50 blur-[64px] saturate-[1.7]"
      />
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-[color-mix(in_oklab,var(--jm-canvas)_45%,transparent)] to-[var(--jm-canvas)]" />
    </div>
  );
}
