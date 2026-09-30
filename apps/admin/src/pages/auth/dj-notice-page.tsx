import { useRouter } from "@tanstack/react-router";
import { Headphones, LogOut } from "lucide-react";
import { Button, Card, Logo } from "@joymusic/ui";
import { LanguageSwitcher } from "../../components/language-switcher";
import { useT } from "../../i18n";
import { session } from "../../lib/api";
import { useSession } from "../../lib/use-session";

export function DjNoticePage() {
  const t = useT();
  const router = useRouter();
  const state = useSession();
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex justify-center">
          <Logo variant="horizontal" height={30} />
        </div>
        <Card variant="raised" padding="lg" className="text-center shadow-[var(--jm-shadow-4)]">
          <div className="mx-auto mb-5 inline-flex size-16 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Headphones aria-hidden="true" className="size-8" />
          </div>
          <h1 className="type-title-lg">{t("dj.title", { name: state.me?.user.name ?? "" })}</h1>
          <p className="type-body mx-auto mt-2 max-w-[38ch] text-fg-muted">{t("dj.description")}</p>
          <ol className="mx-auto mt-6 flex max-w-[360px] flex-col gap-2.5 text-left text-[13.5px] text-fg-muted">
            <li className="flex gap-3">
              <span className="type-mono inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-fg">
                1
              </span>
              {t("dj.step1")}
            </li>
            <li className="flex gap-3">
              <span className="type-mono inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-fg">
                2
              </span>
              {t("dj.step2")}
            </li>
            <li className="flex gap-3">
              <span className="type-mono inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-bold text-fg">
                3
              </span>
              {t("dj.step3")}
            </li>
          </ol>
          <div className="mt-7 flex justify-center">
            <Button
              variant="secondary"
              leftIcon={<LogOut aria-hidden="true" className="size-4" />}
              onClick={() => void session.signOut().then(() => router.history.push("/login"))}
            >
              {t("auth.logout")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
