import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Toaster, TooltipProvider } from "@joymusic/ui";
import type { Locale } from "@joymusic/shared";
import { LocaleProvider } from "../../../src/renderer/i18n";
import { preloadTopics } from "../../../src/renderer/lib/topics";

export async function renderScreen(
  element: ReactElement,
  options: { locale?: Locale; route?: string } = {},
) {
  await preloadTopics();
  return render(
    <MemoryRouter initialEntries={[options.route ?? "/console"]}>
      <LocaleProvider locale={options.locale ?? "en"}>
        <Toaster>
          <TooltipProvider>
            <Routes>
              <Route path="/console" element={element} />
              <Route path="/venues" element={<div data-testid="venues-route" />} />
              <Route path="/settings/:tab" element={<div data-testid="settings-route" />} />
            </Routes>
          </TooltipProvider>
        </Toaster>
      </LocaleProvider>
    </MemoryRouter>,
  );
}
