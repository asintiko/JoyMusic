import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useT } from "../i18n";
import { Breadcrumbs, type Crumb } from "../components/page";
import { useVenues } from "../queries";
import { navItems } from "./nav";

export function RouteBreadcrumbs() {
  const t = useT();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const venues = useVenues();
  const crumbs = useMemo<Crumb[]>(() => {
    const [first, second] = pathname.split("/").filter(Boolean);
    const root: Crumb = { label: "Joy Music", to: "/" };
    if (!first) return [root, { label: t("nav.overview") }];
    const item = navItems.find((entry) => entry.to === `/${first}`);
    const label = item ? t(item.label) : first;
    if (!second) return [root, { label }];
    const parent: Crumb = { label, to: `/${first}` };
    if (first === "venues") {
      if (second === "new") return [root, parent, { label: t("venues.new") }];
      const venue = venues.data?.find((entry) => entry.id === second);
      return [root, parent, { label: venue?.name ?? "…" }];
    }
    return [root, parent, { label: second }];
  }, [pathname, t, venues.data]);
  return <Breadcrumbs items={crumbs} />;
}
