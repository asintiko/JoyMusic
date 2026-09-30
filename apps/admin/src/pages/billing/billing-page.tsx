import { Check, Clock } from "lucide-react";
import { Badge, Button, Card } from "@joymusic/ui";
import { PageHeader } from "../../components/page";
import { useI18n } from "../../i18n";
import type { MessageKey } from "../../i18n";

interface Plan {
  id: "pilot" | "venue" | "network";
  name: MessageKey;
  audience: MessageKey;
  features: MessageKey[];
  current?: boolean;
}

const plans: Plan[] = [
  {
    id: "pilot",
    name: "billing.plan.pilot",
    audience: "billing.plan.pilot.audience",
    features: [
      "billing.feature.venue1",
      "billing.feature.qr",
      "billing.feature.requests",
      "billing.feature.analytics",
    ],
    current: true,
  },
  {
    id: "venue",
    name: "billing.plan.venue",
    audience: "billing.plan.venue.audience",
    features: [
      "billing.feature.venuesUp",
      "billing.feature.djs",
      "billing.feature.print",
      "billing.feature.audit",
    ],
  },
  {
    id: "network",
    name: "billing.plan.network",
    audience: "billing.plan.network.audience",
    features: [
      "billing.feature.unlimited",
      "billing.feature.roles",
      "billing.feature.support",
      "billing.feature.branding",
    ],
  },
];

export function BillingPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("nav.billing")} description={t("billing.subtitle")} />
      <div
        className="mb-6 flex items-start gap-3 rounded-lg bg-info-soft px-4 py-3.5 text-[13.5px] text-info-fg"
        role="status"
      >
        <Clock aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
        <div>
          <p className="font-bold">{t("billing.banner.title")}</p>
          <p className="mt-0.5 text-fg-muted">{t("billing.banner.text")}</p>
        </div>
      </div>
      <div className="grid gap-4 min-[1000px]:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            variant={plan.current ? "brand" : "flat"}
            padding="lg"
            className="flex flex-col gap-5"
            data-testid={`plan-${plan.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="type-title-md">{t(plan.name)}</h2>
                <p className="type-body-sm mt-1 text-fg-muted">{t(plan.audience)}</p>
              </div>
              {plan.current ? (
                <Badge tone="brand">{t("billing.current")}</Badge>
              ) : (
                <Badge tone="neutral">{t("billing.soon")}</Badge>
              )}
            </div>
            <p className="type-title-lg text-fg">
              {plan.current ? t("billing.price.free") : t("billing.price.soon")}
            </p>
            <ul className="flex flex-1 flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13.5px] text-fg-muted">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-fg" />
                  {t(feature)}
                </li>
              ))}
            </ul>
            <Button variant={plan.current ? "secondary" : "ghost"} disabled fullWidth>
              {plan.current ? t("billing.current") : t("billing.soon")}
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-[12.5px] text-fg-subtle">{t("billing.footnote")}</p>
    </>
  );
}
