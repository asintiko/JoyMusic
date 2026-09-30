import { useEffect, useState } from "react";
import { Button, Chip, Dialog, Textarea } from "@joymusic/ui";
import type { RequestItem } from "@joymusic/shared";
import { useT } from "../../i18n";

export interface DeclineDialogProps {
  request: RequestItem | null;
  onCancel(): void;
  onConfirm(id: string, reason: string): void;
}

export function DeclineDialog({ request, onCancel, onConfirm }: DeclineDialogProps) {
  const t = useT();
  const [reason, setReason] = useState("");
  useEffect(() => {
    setReason("");
  }, [request?.id]);
  const presets = [t.reasonPlayed, t.reasonMissing, t.reasonStyle];

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t.declineTitle}
      description={request ? `${request.title} - ${request.artist}` : undefined}
      closeLabel={t.close}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button
            variant="danger"
            data-testid="decline-confirm"
            onClick={() => request && onConfirm(request.id, reason)}
          >
            {t.declineConfirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Chip
              key={preset}
              size="sm"
              selected={reason === preset}
              onClick={() => setReason(reason === preset ? "" : preset)}
            >
              {preset}
            </Chip>
          ))}
        </div>
        <Textarea
          label={t.declineReasonLabel}
          value={reason}
          maxLength={200}
          rows={2}
          data-testid="decline-reason"
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && request) {
              event.preventDefault();
              onConfirm(request.id, reason);
            }
          }}
        />
      </div>
    </Dialog>
  );
}
