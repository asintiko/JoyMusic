import { createContext, useContext } from "react";
import type { Locale } from "@joymusic/shared";
import type { ThemeId } from "../../src";
import { strings } from "./strings";
import type { Strings } from "./strings";

export interface PlaygroundState {
  lang: Locale;
  theme: ThemeId;
  photo: boolean;
}

export const PlaygroundContext = createContext<PlaygroundState>({
  lang: "uz",
  theme: "club",
  photo: false,
});

export function usePlayground(): PlaygroundState & { s: Strings } {
  const state = useContext(PlaygroundContext);
  return { ...state, s: strings[state.lang] };
}
