import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { Building2, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Input } from "@joymusic/ui";
import { useFieldErrorText } from "../../components/field-error";
import { PasswordInput } from "../../components/password-input";
import { useI18n } from "../../i18n";
import { session } from "../../lib/api";
import { describeError } from "../../lib/api-errors";
import { errorText } from "../../lib/error-messages";
import { safeRedirect } from "../../lib/permissions";
import { validateEmail, validatePassword, validateText } from "../../lib/validators";
import { AuthLayout } from "./auth-layout";

export function RegisterPage() {
  const { t, locale } = useI18n();
  const fieldText = useFieldErrorText();
  const router = useRouter();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);

  const errors = touched
    ? {
        name: validateText(name, 1, 80),
        organizationName: validateText(organizationName, 2, 120),
        email: validateEmail(email),
        password: validatePassword(password),
      }
    : { name: null, organizationName: null, email: null, password: null };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setFormError(null);
    setEmailTaken(false);
    if (
      validateText(name, 1, 80) ||
      validateText(organizationName, 2, 120) ||
      validateEmail(email) ||
      validatePassword(password)
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await session.publicClient.call("authRegister", {
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          organizationName: organizationName.trim(),
          locale,
        },
      });
      session.signIn(result);
      router.history.push(safeRedirect(search.redirect));
    } catch (error) {
      if (describeError(error).kind === "email_taken") setEmailTaken(true);
      else setFormError(errorText(t, error));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link
            to="/login"
            search={search.redirect ? { redirect: search.redirect } : undefined}
            className="focus-ring rounded-xs font-bold text-brand hover:underline"
          >
            {t("auth.register.signIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("auth.register.organization")}
          name="organization"
          autoComplete="organization"
          placeholder="Nomad Group"
          leading={<Building2 aria-hidden="true" />}
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          error={fieldText(errors.organizationName, { min: 2, max: 120 })}
          hint={t("auth.register.organizationHint")}
          autoFocus
        />
        <Input
          label={t("auth.register.name")}
          name="name"
          autoComplete="name"
          leading={<UserRound aria-hidden="true" />}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldText(errors.name, { min: 1, max: 80 })}
        />
        <Input
          label={t("auth.email")}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          leading={<Mail aria-hidden="true" />}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailTaken(false);
          }}
          error={emailTaken ? t("err.email_taken") : fieldText(errors.email)}
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
          {t("auth.register.submit")}
        </Button>
        <p className="text-center text-[12px] text-fg-subtle">{t("auth.register.terms")}</p>
      </form>
    </AuthLayout>
  );
}
