import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createMidiController } from "@joymusic/dj-bridge/midi";
import type {
  BindingStorage,
  ConsoleAction,
  MidiAccessLike,
  MidiBinding,
  MidiController,
  MidiDeviceInfo,
  MidiPreset,
  QueueLedState,
} from "@joymusic/dj-bridge/midi";
import { getBridge } from "../bridge/access";
import type { ConsoleIntent } from "../features/console/intents";
import { intentForMidi } from "../features/console/intents";
import { useTopic } from "../lib/topics";

export type MidiStatus = "off" | "unsupported" | "denied" | "ready";

export interface MidiContextValue {
  status: MidiStatus;
  devices: MidiDeviceInfo[];
  bindings: MidiBinding[];
  detectedPreset: MidiPreset | null;
  learning: ConsoleAction | null;
  learn(action: ConsoleAction): Promise<void>;
  cancelLearn(): void;
  clear(action: ConsoleAction): void;
  applyPreset(id: string): Promise<void>;
  registerIntentHandler(handler: ((intent: ConsoleIntent) => void) | null): void;
  setLedState(state: QueueLedState | null): void;
}

const noop = () => undefined;

const MidiContext = createContext<MidiContextValue>({
  status: "off",
  devices: [],
  bindings: [],
  detectedPreset: null,
  learning: null,
  learn: async () => undefined,
  cancelLearn: noop,
  clear: noop,
  applyPreset: async () => undefined,
  registerIntentHandler: noop,
  setLedState: noop,
});

export function useMidi(): MidiContextValue {
  return useContext(MidiContext);
}

function bridgeStorage(): BindingStorage {
  return {
    load: () => getBridge().midi.loadBindings(),
    save: (json) => getBridge().midi.saveBindings(json),
  };
}

export function MidiProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const settings = useTopic("settings");
  const [status, setStatus] = useState<MidiStatus>("off");
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [bindings, setBindings] = useState<MidiBinding[]>([]);
  const [detectedPreset, setDetectedPreset] = useState<MidiPreset | null>(null);
  const [learning, setLearning] = useState<ConsoleAction | null>(null);
  const controllerRef = useRef<MidiController | null>(null);
  const handlerRef = useRef<((intent: ConsoleIntent) => void) | null>(null);
  const ledRef = useRef<QueueLedState | null>(null);
  const ledEnabled = settings.midi.ledFeedback;
  const midiEnabled = enabled && settings.midi.enabled;

  const pushLeds = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (ledEnabled && ledRef.current) controller.setLedState(ledRef.current);
    else controller.clearLeds();
  }, [ledEnabled]);

  useEffect(() => {
    if (!midiEnabled) {
      setStatus("off");
      return undefined;
    }
    if (typeof navigator.requestMIDIAccess !== "function") {
      setStatus("unsupported");
      return undefined;
    }
    let cancelled = false;
    let controller: MidiController | null = null;
    let stopAction: (() => void) | null = null;
    let stopDevices: (() => void) | null = null;
    navigator
      .requestMIDIAccess({ sysex: false })
      .then(async (access) => {
        if (cancelled) return;
        controller = createMidiController({
          access: access as unknown as MidiAccessLike,
          storage: bridgeStorage(),
          onError: () => undefined,
        });
        await controller.load();
        if (controller.bindings().length === 0 && settings.midi.presetId) {
          try {
            controller.applyPreset(settings.midi.presetId);
          } catch {
            controller.setBindings([]);
          }
        }
        controllerRef.current = controller;
        stopAction = controller.onAction((event) => {
          handlerRef.current?.(intentForMidi(event.action));
        });
        stopDevices = controller.onDevicesChanged((list) => {
          setDevices(list);
          setDetectedPreset(controller?.detectPreset() ?? null);
        });
        controller.start();
        setDevices(controller.devices());
        setBindings(controller.bindings());
        setDetectedPreset(controller.detectPreset());
        setStatus("ready");
        pushLeds();
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });
    return () => {
      cancelled = true;
      stopAction?.();
      stopDevices?.();
      controller?.stop();
      controllerRef.current = null;
    };
  }, [midiEnabled, settings.midi.presetId, pushLeds]);

  useEffect(() => {
    pushLeds();
  }, [pushLeds]);

  const persist = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    setBindings(controller.bindings());
    await controller.save();
    pushLeds();
  }, [pushLeds]);

  const value = useMemo<MidiContextValue>(
    () => ({
      status,
      devices,
      bindings,
      detectedPreset,
      learning,
      async learn(action) {
        const controller = controllerRef.current;
        if (!controller) return;
        setLearning(action);
        try {
          await controller.learn(action);
          await persist();
        } catch {
          return;
        } finally {
          setLearning(null);
        }
      },
      cancelLearn() {
        controllerRef.current?.cancelLearn();
      },
      clear(action) {
        controllerRef.current?.removeBinding(action);
        void persist();
      },
      async applyPreset(id) {
        const controller = controllerRef.current;
        if (!controller) return;
        controller.applyPreset(id);
        await persist();
      },
      registerIntentHandler(handler) {
        handlerRef.current = handler;
      },
      setLedState(state) {
        ledRef.current = state;
        pushLeds();
      },
    }),
    [status, devices, bindings, detectedPreset, learning, persist, pushLeds],
  );

  return <MidiContext.Provider value={value}>{children}</MidiContext.Provider>;
}
