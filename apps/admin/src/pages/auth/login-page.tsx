import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { LogIn, Mail } from "lucide-react";
import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Button, Input } from "@joymusic/ui";
import { useFieldErrorText } from "../../components/field-error";
import { PasswordInput } from "../../components/password-input";
import { useT } from "../../i18n";
import { session } from "../../lib/api";
import { errorText } from "../../lib/error-messages";
import { safeRedirect } from "../../lib/permissions";
import { env } from "../../lib/env";
import { validateEmail } from "../../lib/validators";
import { AuthLayout } from "./auth-layout";
import { GoogleButton } from "./google-button";

export function LoginPage() {
  const t = useT();
  const fieldText = useFieldErrorText();
  const router = useRouter();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = touched ? validateEmail(email) : null;
  const passwordError = touched && !password ? ("required" as const) : null;

  const finish = useCallback(() => {
    router.history.push(safeRedirect(search.redirect));
  }, [router, search.redirect]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    if (validateEmail(email) || !password) return;
    setBusy(true);
    try {
      const result = await session.publicClient.call("authLogin", {
        body: { email: email.trim(), password },
      });
      session.signIn(result);
      finish();
    } catch (error) {
      setFormError(errorText(t, error));
      setBusy(false);
    }
  };

  const google = useCallback(
    (idToken: string) => {
      setFormError(null);
      session.publicClient
        .call("authGoogle", { body: { idToken } })
        .then((result) => {
          session.signIn(result);
          finish();
        })
        .catch((error: unknown) => setFormError(errorText(t, error)));
    },
    [finish, t],
  );

  const googleFailed = useCallback(() => setFormError(t("auth.googleFailed")), [t]);

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link
            to="/register"
            search={search.redirect ? { redirect: search.redirect } : undefined}
            className="focus-ring rounded-xs font-bold text-brand hover:underline"
          >
            {t("auth.login.createOrg")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("auth.email")}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          placeholder="name@venue.uz"
          leading={<Mail aria-hidden="true" />}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldText(emailError)}
          size="lg"
          autoFocus
        />
        <PasswordInput
          label={t("auth.password")}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldText(passwordError)}
          size="lg"
        />
        {formError ? (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
          >
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={busy}
          leftIcon={<LogIn aria-hidden="true" className="size-[18px]" />}
        >
          {t("auth.login.submit")}
        </Button>
        {env.googleClientId ? (
          <>
            <div className="flex items-center gap-3 text-[12px] text-fg-subtle">
              <span className="h-px flex-1 bg-[var(--jm-line)]" />
              {t("auth.or")}
              <span className="h-px flex-1 bg-[var(--jm-line)]" />
            </div>
            <GoogleButton onCredential={google} onFailure={googleFailed} />
          </>
        ) : null}
      </form>
    </AuthLayout>
  );
}
