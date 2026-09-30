export type DemoStep = "idle" | "results" | "compose" | "sent" | "accepted" | "playing";

export interface DemoState {
  step: DemoStep;
  trackId: string | null;
  dedication: boolean;
}

export type DemoAction =
  | { type: "open" }
  | { type: "pick"; trackId: string }
  | { type: "toggleDedication" }
  | { type: "send" }
  | { type: "advance" }
  | { type: "back" }
  | { type: "reset" };

export const demoInitialState: DemoState = { step: "idle", trackId: null, dedication: false };

export const demoStepOrder: readonly DemoStep[] = [
  "idle",
  "results",
  "compose",
  "sent",
  "accepted",
  "playing",
];

export const demoAutoAdvanceMs: Partial<Record<DemoStep, number>> = {
  sent: 1400,
  accepted: 2200,
};

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "open":
      return state.step === "idle" ? { ...state, step: "results" } : state;
    case "pick":
      return state.step === "results"
        ? { step: "compose", trackId: action.trackId, dedication: false }
        : state;
    case "toggleDedication":
      return state.step === "compose" ? { ...state, dedication: !state.dedication } : state;
    case "send":
      return state.step === "compose" && state.trackId !== null ? { ...state, step: "sent" } : state;
    case "advance":
      if (state.step === "sent") return { ...state, step: "accepted" };
      if (state.step === "accepted") return { ...state, step: "playing" };
      return state;
    case "back":
      if (state.step === "results") return demoInitialState;
      if (state.step === "compose") return { ...state, step: "results", trackId: null };
      return state;
    case "reset":
      return demoInitialState;
  }
}

export function demoStepNumber(step: DemoStep): number {
  return demoStepOrder.indexOf(step) + 1;
}

export function isDemoWaiting(step: DemoStep): boolean {
  return demoAutoAdvanceMs[step] !== undefined;
}
