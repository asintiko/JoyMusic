import { useT } from "../i18n";
import type { FieldError } from "../lib/validators";

export function useFieldErrorText() {
  const t = useT();
  return (error: FieldError, params?: { min?: number; max?: number }): string | undefined => {
    switch (error) {
      case null:
        return undefined;
      case "required":
        return t("form.required");
      case "email":
        return t("form.email");
      case "passwordShort":
        return t("form.passwordShort");
      case "tooShort":
        return t("form.tooShort", { min: params?.min ?? 2 });
      case "tooLong":
        return t("form.tooLong", { max: params?.max ?? 120 });
    }
  };
}
