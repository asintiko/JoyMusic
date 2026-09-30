import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Locale } from "@joymusic/shared";
import { I18nProvider } from "@/components/i18n";
import { Toaster } from "@/components/toaster";

export function renderWithI18n(ui: ReactElement, locale: Locale = "en") {
  return render(
    <I18nProvider initialLocale={locale} persist={false}>
      <Toaster dismissLabel="Dismiss">{ui}</Toaster>
    </I18nProvider>,
  );
}
