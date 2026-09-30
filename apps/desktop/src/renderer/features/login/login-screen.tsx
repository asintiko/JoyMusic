import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router";
import { ExternalLink, Globe, Loader } from "lucide-react";
import { AmbientBackground, Button, Chip, Input, Logo } from "@joymusic/ui";
import { locales } from "@joymusic/shared";
import type { AppInfo } from "../../../common/bridge";
import { BridgeFailure, getBridge, unwrap } from "../../bridge/access";
import { useLocale, useT } from "../../i18n";
import { useTopic } from "../../lib/topics";
import { useApplyTheme } from "../../state/appearance";

const brandAmbient = ["#7A5CFF", "#FF4FD8", "#3B2A8F"];

export function LoginScreen() {
  const t = useT();
  const locale = useLocale();
  const auth = useTopic("auth");
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useApplyTheme("club");

  useEffect(() => {
    void getBridge().info().then(setInfo);
  }, []);

  if (auth.status === "signedIn") return <Navigate to="/venues" replace />;

  const messageFor = (code: string | null): string | null => {
    if (!code) return null;
    const known = t.errors[code];
    return known ?? t.errors.generic;
  };
  const shownError = messageFor(error ?? auth.error);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      unwrap(await getBridge().auth.loginWithPassword(email, password));
    } catch (failure) {
      setError(
        failure instanceof BridgeFailure ? (failure.network ? "network" : failure.code) : "generic",
      );
    } finally {
      setBusy(false);
    }
  };

  const startBrowser = async () => {
    setError(null);
    try {
      unwrap(await getBridge().auth.beginBrowserLogin());
    } catch (failure) {
      setError(failure instanceof BridgeFailure ? failure.code : "generic");
    }
  };

  return (
    <main
      className="relative flex h-dvh items-center justify-center overflow-hidden bg-canvas"
      data-testid="login"
    >
      <AmbientBackground colors={brandAmbient} intensity={0.9} />
      <div className="jm-glass relative z-10 flex w-[440px] max-w-[92vw] flex-col gap-6 rounded-[28px] p-9 shadow-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo variant="stacked" height={92} />
          <div>
            <h1 className="font-display text-[22px] font-semibold tracking-[-0.015em]">
              {t.loginTitle}
            </h1>
            <p className="mt-1.5 text-[14px] text-fg-muted">{t.loginSubtitle}</p>
          </div>
        </div>

        {auth.browserLoginPending ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg bg-surface-2 p-5 text-center hairline"
            data-testid="browser-pending"
          >
            <Loader aria-hidden="true" className="size-6 animate-spin text-brand" />
            <p className="text-[14px] font-bold">{t.loginBrowserWaiting}</p>
            <p className="text-[13px] text-fg-muted">{t.loginBrowserHint}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => void startBrowser()}>
                {t.loginBrowserReopen}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void getBridge().auth.cancelBrowserLogin()}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="lg"
            fullWidth
            data-testid="login-browser"
            leftIcon={<ExternalLink aria-hidden="true" className="size-[18px]" />}
            onClick={() => void startBrowser()}
          >
            {t.loginBrowser}
          </Button>
        )}

        <div className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
          <span className="h-px flex-1 bg-line" />
          {t.loginOr}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
          <Input
            label={t.loginEmail}
            type="email"
            autoComplete="username"
            required
            value={email}
            data-testid="login-email"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label={t.loginPassword}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            data-testid="login-password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {shownError ? (
            <p
              role="alert"
              data-testid="login-error"
              className="rounded-md bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger-fg"
            >
              {shownError}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            fullWidth
            loading={busy}
            data-testid="login-submit"
          >
            {t.loginSubmit}
          </Button>
        </form>

        <div className="flex items-center justify-between gap-3 text-[12px] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Globe aria-hidden="true" className="size-3.5" />
            <span className="type-mono">{info ? new URL(info.apiUrl).host : ""}</span>
          </span>
          <div role="group" aria-label={t.language} className="flex gap-1">
            {locales.map((code) => (
              <Chip
                key={code}
                size="sm"
                selected={code === locale}
                onClick={() => void getBridge().settings.update({ locale: code })}
              >
                {code.toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
