import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { IconButton, useToast } from "@joymusic/ui";
import { useT } from "../i18n";

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyButton({
  value,
  label,
  size = "sm",
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const t = useT();
  const toast = useToast();
  const [done, setDone] = useState(false);
  return (
    <IconButton
      size={size}
      label={label ?? t("common.copy")}
      icon={
        done ? (
          <Check aria-hidden="true" className="size-4 text-success-fg" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )
      }
      onClick={async () => {
        const ok = await copyText(value);
        if (ok) {
          setDone(true);
          toast.success(t("common.copied"));
          window.setTimeout(() => setDone(false), 1600);
        } else {
          toast.error(t("common.copyFailed"));
        }
      }}
    />
  );
}
