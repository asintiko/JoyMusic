import { Button, Dialog, Input } from "@joymusic/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { useT } from "../i18n";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  requireText?: string;
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "primary",
  loading,
  requireText,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const blocked = requireText !== undefined && typed.trim() !== requireText;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
      title={title}
      size="sm"
      closeLabel={t("common.close")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={loading}
            disabled={blocked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {description ? <p className="type-body text-fg-muted">{description}</p> : null}
        {children}
        {requireText !== undefined ? (
          <Input
            label={t("confirm.typeToConfirm", { text: requireText })}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
