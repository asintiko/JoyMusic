import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Toaster, TooltipProvider } from "@joymusic/ui";
import type { Locale } from "@joymusic/shared";
import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "../src/i18n";

export async function renderRoute(
  ui: ReactElement,
  options: { path?: string; url?: string; locale?: Locale } = {},
) {
  const path = options.path ?? "/";
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const root = createRootRoute();
  const page = createRoute({ getParentRoute: () => root, path, component: () => ui });
  const stubs = ["/", "/login", "/register", "/djs", "/moderation", "/qr", "/venues"]
    .filter((stub) => stub !== path)
    .map((stub) =>
      createRoute({
        getParentRoute: () => root,
        path: stub,
        component: () => <div data-testid={`stub-${stub}`} />,
      }),
    );
  const router = createRouter({
    routeTree: root.addChildren([page, ...stubs]),
    history: createMemoryHistory({ initialEntries: [options.url ?? path] }),
  });
  const result = render(
    <I18nProvider initialLocale={options.locale ?? "en"}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Toaster>
            <RouterProvider router={router} />
          </Toaster>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  await act(async () => {
    await router.load();
  });
  return { ...result, router, client };
}
