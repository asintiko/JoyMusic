export type PreviewStatus = "idle" | "loading" | "playing";

export interface PreviewState {
  trackId: string | null;
  status: PreviewStatus;
  progress: number;
}

export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  preload: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface PreviewPlayer {
  toggle(trackId: string, url: string): void;
  stop(): void;
  getState(): PreviewState;
  subscribe(listener: (state: PreviewState) => void): () => void;
}

const idleState: PreviewState = { trackId: null, status: "idle", progress: 0 };

export function createPreviewPlayer(createAudio: () => AudioLike): PreviewPlayer {
  const listeners = new Set<(state: PreviewState) => void>();
  let state = idleState;
  let audio: AudioLike | null = null;
  let detach: (() => void) | null = null;

  function set(next: PreviewState) {
    state = next;
    for (const listener of listeners) listener(next);
  }

  function release() {
    detach?.();
    detach = null;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    audio = null;
  }

  function stop() {
    release();
    set(idleState);
  }

  function toggle(trackId: string, url: string) {
    if (state.trackId === trackId && state.status !== "idle") {
      stop();
      return;
    }
    release();
    const element = createAudio();
    audio = element;
    element.preload = "auto";
    element.src = url;
    const onPlaying = () => set({ trackId, status: "playing", progress: state.progress });
    const onTime = () => {
      const duration = element.duration > 0 ? element.duration : 30;
      set({ trackId, status: "playing", progress: Math.min(1, element.currentTime / duration) });
    };
    const onEnd = () => stop();
    const onError = () => stop();
    element.addEventListener("playing", onPlaying);
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("ended", onEnd);
    element.addEventListener("error", onError);
    detach = () => {
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("ended", onEnd);
      element.removeEventListener("error", onError);
    };
    set({ trackId, status: "loading", progress: 0 });
    const started = element.play() as Promise<void> | undefined;
    started?.catch(() => {
      if (audio === element) stop();
    });
  }

  return {
    toggle,
    stop,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let shared: PreviewPlayer | null = null;

export function sharedPreviewPlayer(): PreviewPlayer {
  if (!shared) shared = createPreviewPlayer(() => new Audio());
  return shared;
}
