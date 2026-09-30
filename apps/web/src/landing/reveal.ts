import type { CSSProperties } from "react";

export function reveal(index = 0): { "data-reveal": string; style: CSSProperties } {
  return {
    "data-reveal": "",
    style: { "--reveal-delay": `${Math.min(index, 8) * 90}ms` } as CSSProperties,
  };
}
