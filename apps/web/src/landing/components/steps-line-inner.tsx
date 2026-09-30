"use client";

import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { LazyMotion, domAnimation } from "motion/react";

export function activeStepCount(progress: number, total: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return clamped > 0 ? Math.min(total, Math.floor(clamped * total) + 1) : 0;
}

export default function StepsLineInner({ containerId }: { containerId: string }) {
  const reduced = useReducedMotion();
  const target = typeof document === "undefined" ? null : document.getElementById(containerId);
  const { scrollYProgress } = useScroll({
    target: target ? { current: target } : undefined,
    offset: ["start 85%", "end 55%"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.6 });
  const scaleX = useTransform(reduced ? scrollYProgress : smooth, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const steps = Array.from(container.querySelectorAll<HTMLElement>("[data-step]"));
    const count = activeStepCount(value, steps.length);
    steps.forEach((step, index) => {
      step.setAttribute("data-active", String(index < count));
    });
  });

  return (
    <LazyMotion features={domAnimation} strict>
      <m.span style={{ scaleX }} />
    </LazyMotion>
  );
}
