import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Dialog, Input, Tabs, TabsList, TabsTrigger, useToast } from "@joymusic/ui";
import { useI18n } from "../../i18n";
import { errorText } from "../../lib/error-messages";
import { bulkLabels, nextTableNumber } from "../../lib/qr-studio";
import { validateText } from "../../lib/validators";
import { useFieldErrorText } from "../../components/field-error";
import { useCreateQr, useUpdateQr } from "../../queries";

export function CreateCodeDialog({
  open,
  onOpenChange,
  venueId,
  existingLabels,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  existingLabels: readonly string[];
  onCreated: (label: string) => void;
}) {
  const { t } = useI18n();
  const fieldText = useFieldErrorText();
  const toast = useToast();
  const create = useCreateQr(venueId);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [label, setLabel] = useState("");
  const [prefix, setPrefix] = useState("Table");
  const [count, setCount] = useState("10");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = nextTableNumber(existingLabels);
  const bulkCount = Math.min(50, Math.max(1, Number.parseInt(count, 10) || 0));
  const labelError = touched ? validateText(label, 1, 40) : null;

  const reset = () => {
    setLabel("");
    setTouched(false);
    setError(null);
    setBusy(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (mode === "single") {
      if (validateText(label, 1, 40)) return;
      try {
        setBusy(true);
        const code = await create.mutateAsync(label.trim());
        toast.success(t("qr.created", { label: code.label }));
        onCreated(code.label);
        reset();
        onOpenChange(false);
      } catch (failure) {
        setError(errorText(t, failure));
        setBusy(false);
      }
      return;
    }
    if (!Number.parseInt(count, 10) || Number.parseInt(count, 10) < 1) return;
    setBusy(true);
    const labels = bulkLabels(prefix, start, bulkCount);
    let created = 0;
    try {
      for (const entry of labels) {
        await create.mutateAsync(entry);
        created += 1;
      }
      toast.success(t("qr.createdMany", { count: created }));
      onCreated(labels[0] ?? "");
      reset();
      onOpenChange(false);
    } catch (failure) {
      setError(
        `${t("qr.createdPartial", { done: created, total: labels.length })} ${errorText(t, failure)}`,
      );
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("qr.newCode")}
      description={t("qr.newCodeHint")}
      closeLabel={t("common.close")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="create-code-form" loading={busy}>
            {mode === "single" ? t("common.create") : t("qr.createMany", { count: bulkCount })}
          </Button>
        </div>
      }
    >
      <form id="create-code-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Tabs
          variant="segmented"
          value={mode}
          onValueChange={(value) => setMode(value as "single" | "bulk")}
        >
          <TabsList aria-label={t("qr.newCode")}>
            <TabsTrigger value="single">{t("qr.mode.single")}</TabsTrigger>
            <TabsTrigger value="bulk">{t("qr.mode.bulk")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "single" ? (
          <Input
            label={t("qr.label")}
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("qr.labelPlaceholder", { n: start })}
            error={fieldText(labelError, { min: 1, max: 40 })}
            autoFocus
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("qr.prefix")}
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              maxLength={30}
            />
            <Input
              label={t("qr.count")}
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              hint={t("qr.bulkPreview", {
                first: bulkLabels(prefix, start, 1)[0] ?? "",
                last: bulkLabels(prefix, start, bulkCount).at(-1) ?? "",
              })}
            />
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

export function RenameCodeDialog({
  open,
  onOpenChange,
  venueId,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  target: { id: string; label: string } | null;
}) {
  const { t } = useI18n();
  const fieldText = useFieldErrorText();
  const toast = useToast();
  const update = useUpdateQr(venueId);
  const [label, setLabel] = useState(target?.label ?? "");
  const [touched, setTouched] = useState(false);
  const error = touched ? validateText(label, 1, 40) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!target || validateText(label, 1, 40)) return;
    try {
      await update.mutateAsync({ id: target.id, label: label.trim() });
      toast.success(t("qr.renamed"));
      onOpenChange(false);
    } catch (failure) {
      toast.error(t("qr.renameFailed"), errorText(t, failure));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("qr.rename")}
      size="sm"
      closeLabel={t("common.close")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="rename-code-form" loading={update.isPending}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <form id="rename-code-form" onSubmit={submit} noValidate>
        <Input
          label={t("qr.label")}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          error={fieldText(error, { min: 1, max: 40 })}
          autoFocus
        />
      </form>
    </Dialog>
  );
}
