import { Link, useRouter } from "@tanstack/react-router";
import { Button, Logo } from "@joymusic/ui";
import { useT } from "../i18n";
import { Empty } from "../components/empty";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-4">
      <Logo variant="horizontal" height={28} />
      <Empty
        illustration="search"
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Link
            to="/"
            className="focus-ring inline-flex h-10 items-center rounded-md bg-brand-gradient-strong px-4 text-[14px] font-bold text-on-brand"
          >
            {t("notFound.home")}
          </Link>
        }
      />
    </div>
  );
}

export function BootSplash() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-dvh items-center justify-center bg-canvas"
    >
      <Logo variant="mark" height={44} className="animate-pulse" />
    </div>
  );
}

export function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const t = useT();
  const router = useRouter();
  console.error(error);
  return (
    <div
      role="alert"
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-4"
    >
      <Logo variant="horizontal" height={28} />
      <Empty
        illustration="error"
        title={t("error.boundary.title")}
        description={t("error.boundary.description")}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
