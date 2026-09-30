import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { useT } from "../i18n";
import { Empty } from "./empty";

export function NoVenue() {
  const t = useT();
  return (
    <div className="rounded-lg bg-surface-1 hairline">
      <Empty
        size="lg"
        illustration="qr"
        title={t("qr.noVenue.title")}
        description={t("qr.noVenue.description")}
        action={
          <Link
            to="/venues/new"
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-brand-gradient-strong px-4 text-[14px] font-bold text-on-brand"
          >
            <Store aria-hidden="true" className="size-4" />
            {t("venues.createFirst")}
          </Link>
        }
      />
    </div>
  );
}
