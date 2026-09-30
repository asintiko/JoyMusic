import { useEffect, useRef } from "react";
import { env } from "../../lib/env";
import { useI18n } from "../../i18n";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

const scriptSource = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${scriptSource}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptSource;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed"));
    document.head.appendChild(script);
  });
}

export function GoogleButton({
  onCredential,
  onFailure,
}: {
  onCredential: (idToken: string) => void;
  onFailure: () => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const { locale } = useI18n();

  useEffect(() => {
    if (!env.googleClientId) return undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        const google = (window as unknown as { google?: GoogleIdentity }).google;
        if (!google) return;
        google.accounts.id.initialize({
          client_id: env.googleClientId,
          callback: (response) => onCredential(response.credential),
        });
        google.accounts.id.renderButton(holder.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 400,
          locale,
        });
      })
      .catch(onFailure);
    return () => {
      cancelled = true;
    };
  }, [onCredential, onFailure, locale]);

  if (!env.googleClientId) return null;
  return <div ref={holder} data-testid="google-button" className="flex min-h-11 justify-center" />;
}
