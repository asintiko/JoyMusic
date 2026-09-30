"use client";

import { Download, Share, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RealtimeStatus } from "@joymusic/shared";
import { Button, IconButton } from "@joymusic/ui";
import type { ExternalValue } from "@/lib/external-value";
import { useConnectivity } from "./use-venue-feed";
import { useI18n } from "@/components/i18n";
import { browserStorage } from "@/lib/storage";

export function OfflineBanner({ status }: { status: ExternalValue<RealtimeStatus> }) {
  const { t } = useI18n();
  const online = useConnectivity(status);
  const [restored, setRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setRestored(false);
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    setRestored(true);
    const timer = window.setTimeout(() => setRestored(false), 2200);
    return () => window.clearTimeout(timer);
  }, [online]);

  if (online && !restored) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--jm-safe-bottom)+84px)] z-[500] flex justify-center px-4">
      <div
        role="status"
        data-testid="offline-banner"
        data-online={online}
        className="jm-rise flex h-10 items-center gap-2 rounded-pill bg-surface-4 px-4 text-[13.5px] font-bold text-fg shadow-3 hairline-strong"
      >
        {online ? (
          <span aria-hidden="true" className="size-2 rounded-full bg-playing" />
        ) : (
          <WifiOff aria-hidden="true" className="size-4 text-next-fg" />
        )}
        {online ? t.offlineRestored : t.offlineBanner}
      </div>
    </div>
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const dismissedKey = "jm:install-dismissed";
const visitsKey = "jm:visits";
const dismissTtlMs = 14 * 24 * 3_600_000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallHint({ engaged }: { engaged: boolean }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const storage = browserStorage();
    const last = Number(storage.get(dismissedKey) ?? 0);
    setDismissed(isStandalone() || Date.now() - last < dismissTtlMs);
    setIos(isIos());
    const visits = Number(storage.get(visitsKey) ?? 0) + 1;
    storage.set(visitsKey, String(visits));
    setReturning(visits >= 3);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const eligible = engaged || returning;
  const supported = prompt !== null || ios;
  if (dismissed || !eligible || !supported) return null;

  const dismiss = () => {
    browserStorage().set(dismissedKey, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--jm-safe-bottom)+84px)] z-40 px-4">
      <div
        data-testid="install-hint"
        className="jm-rise pointer-events-auto jm-glass mx-auto flex max-w-[560px] items-center gap-3 rounded-xl p-3 shadow-3"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          {prompt ? (
            <Download aria-hidden="true" className="size-5" />
          ) : (
            <Share aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold leading-tight">{t.installTitle}</p>
          <p className="text-[12.5px] leading-snug text-fg-muted">
            {prompt ? t.installText : t.installIosText}
          </p>
        </div>
        {prompt ? (
          <Button
            size="sm"
            onClick={() => {
              void prompt
                .prompt()
                .then(() => prompt.userChoice)
                .then(() => dismiss());
            }}
          >
            {t.installAction}
          </Button>
        ) : null}
        <IconButton
          label={t.installDismiss}
          icon={<X aria-hidden="true" className="size-4" />}
          size="sm"
          onClick={dismiss}
        />
      </div>
    </div>
  );
}
