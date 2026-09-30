import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Toaster, TooltipProvider } from "@joymusic/ui";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { I18nProvider, useT } from "./i18n";
import { session } from "./lib/api";

function ToasterHost({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <Toaster position="bottom" dismissLabel={t("common.close")}>
      {children}
    </Toaster>
  );
}

function SessionCacheGuard({ client }: { client: QueryClient }) {
  useEffect(() => {
    let last = session.getSnapshot();
    return session.subscribe(() => {
      const next = session.getSnapshot();
      const changed =
        next.status !== last.status ||
        next.activeOrganizationId !== last.activeOrganizationId ||
        next.me?.user.id !== last.me?.user.id;
      if (changed && last.status !== "booting") client.clear();
      last = next;
    });
  }, [client]);
  return null;
}

export function Providers({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <ToasterHost>
            <SessionCacheGuard client={client} />
            {children}
          </ToasterHost>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
