import { Link, useParams, useRouter } from "@tanstack/react-router";
import { MailCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Input } from "@joymusic/ui";
import { useFieldErrorText } from "../../components/field-error";
import { PasswordInput } from "../../components/password-input";
import { useT } from "../../i18n";
import { session } from "../../lib/api";
import { describeError } from "../../lib/api-errors";
import { errorText } from "../../lib/error-messages";
import { validatePassword, validateText } from "../../lib/validators";
import { AuthLayout } from "./auth-layout";
import { Empty } from "../../components/empty";

export function InvitePage() {
  const t = useT();
  const fieldText = useFieldErrorText();
  const router = useRouter();
  const { token } = useParams({ strict: false }) as { token: string };
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const errors = touched
    ? { name: validateText(name, 1, 80), password: validatePassword(password) }
    : { name: null, password: null };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    if (validateText(name, 1, 80) || validatePassword(password)) return;
    setBusy(true);
    try {
      const result = await session.publicClient.call("authInviteAccept", {
        body: { token, name: name.trim(), password },
      });
      session.signIn(result);
      router.history.push("/");
    } catch (error) {
      if (describeError(error).kind === "invite_invalid") setInvalid(true);
      else setFormError(errorText(t, error));
      setBusy(false);
    }
  };

  if (invalid) {
    return (
      <AuthLayout title={t("invite.invalid.title")}>
        <Empty
          size="sm"
          illustration="closed"
          title={t("err.invite_invalid")}
          description={t("invite.invalid.description")}
          action={
            <Link
              to="/login"
              className="focus-ring rounded-md bg-surface-3 px-4 py-2 text-[14px] font-bold hairline-strong hover:bg-surface-4"
            >
              {t("auth.login.submit")}
            </Link>
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("invite.title")}
      subtitle={t("invite.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link to="/login" className="focus-ring rounded-xs font-bold text-brand hover:underline">
            {t("auth.register.signIn")}
          </Link>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-3 rounded-md bg-brand-soft px-3.5 py-3 text-[13px] text-fg-muted">
        <MailCheck aria-hidden="true" className="size-5 shrink-0 text-brand" />
        {t("invite.note")}
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("auth.register.name")}
          name="name"
          autoComplete="name"
          leading={<UserRound aria-hidden="true" />}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldText(errors.name, { min: 1, max: 80 })}
          autoFocus
        />
        <PasswordInput
          label={t("auth.password")}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldText(errors.password)}
          hint={t("auth.register.passwordHint")}
        />
        {formError ? (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
          >
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {t("invite.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
