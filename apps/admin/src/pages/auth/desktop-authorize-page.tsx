import { useRouter, useSearch } from "@tanstack/react-router";
import { Laptop, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Avatar, Button, Card, Logo } from "@joymusic/ui";
import { LanguageSwitcher } from "../../components/language-switcher";
import { useT } from "../../i18n";
import { api, session } from "../../lib/api";
import { errorText } from "../../lib/error-messages";
import { desktopCallbackUrl } from "../../lib/invite-link";
import { useSession } from "../../lib/use-session";
import { Empty } from "../../components/empty";

export interface DesktopParams {
  state: string;
  challenge: string;
}

export function parseDesktopParams(search: Record<string, unknown>): DesktopParams | null {
  const state = typeof search.state === "string" ? search.state : "";
  const challenge = typeof search.challenge === "string" ? search.challenge : "";
  if (state.length < 8 || state.length > 128) return null;
  if (challenge.length < 43 || challenge.length > 128) return null;
  return { state, challenge };
}

export function DesktopAuthorizePage() {
  const t = useT();
  const router = useRouter();
  const state = useSession();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const params = parseDesktopParams(search);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const user = state.me?.user;

  const authorize = async () => {
    if (!params) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.call("authDesktopAuthorize", {
        body: { codeChallenge: params.challenge, state: params.state },
      });
      const target = desktopCallbackUrl(result.code, result.state);
      setRedirected(target);
      window.location.href = target;
    } catch (failure) {
      setError(errorText(t, failure));
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (!params) {
    body = (
      <Empty
        size="sm"
        illustration="error"
        title={t("desktop.invalid.title")}
        description={t("desktop.invalid.description")}
      />
    );
  } else if (denied) {
    body = (
      <Empty
        size="sm"
        illustration="closed"
        title={t("desktop.denied.title")}
        description={t("desktop.denied.description")}
        action={
          <Button variant="secondary" onClick={() => setDenied(false)}>
            {t("desktop.denied.back")}
          </Button>
        }
      />
    );
  } else if (redirected) {
    body = (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-success-soft text-success-fg">
          <ShieldCheck aria-hidden="true" className="size-7" />
        </div>
        <div>
          <h2 className="type-title-md">{t("desktop.done.title")}</h2>
          <p className="type-body-sm mt-1.5 text-fg-muted">{t("desktop.done.description")}</p>
        </div>
        <a
          href={redirected}
          className="focus-ring rounded-md bg-surface-3 px-4 py-2 text-[14px] font-bold hairline-strong hover:bg-surface-4"
        >
          {t("desktop.done.retry")}
        </a>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Laptop aria-hidden="true" className="size-7" />
          </div>
          <div>
            <h1 className="type-title-lg">{t("desktop.title")}</h1>
            <p className="type-body-sm mt-1.5 text-fg-muted">{t("desktop.description")}</p>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-md bg-surface-2 p-3 hairline">
            <Avatar name={user.name} src={user.avatarUrl} size={40} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-bold">{user.name}</p>
              <p className="truncate text-[12.5px] text-fg-muted">{user.email}</p>
            </div>
            <button
              type="button"
              className="focus-ring rounded-xs text-[12.5px] font-bold text-brand hover:underline"
              onClick={() => {
                void session
                  .signOut()
                  .then(() =>
                    router.history.push(
                      `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                    ),
                  );
              }}
            >
              {t("desktop.switchAccount")}
            </button>
          </div>
        ) : null}
        <ul className="flex flex-col gap-2 text-[13px] text-fg-muted">
          <li className="flex gap-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-fg" />
            {t("desktop.point1")}
          </li>
          <li className="flex gap-2">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-fg" />
            {t("desktop.point2")}
          </li>
        </ul>
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth loading={busy} onClick={() => void authorize()}>
            {t("desktop.authorize")}
          </Button>
          <Button size="lg" variant="ghost" fullWidth onClick={() => setDenied(true)}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <Logo variant="horizontal" height={30} />
        </div>
        <Card variant="raised" padding="lg" className="shadow-[var(--jm-shadow-4)]">
          {body}
        </Card>
      </div>
    </div>
  );
}
