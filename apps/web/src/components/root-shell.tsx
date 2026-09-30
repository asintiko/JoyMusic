import type { ReactNode } from "react";
import type { Locale, VenueTheme } from "@joymusic/shared";

export function RootShell({
  locale,
  theme,
  bodyClassName,
  children,
}: {
  locale: Locale;
  theme: VenueTheme;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
