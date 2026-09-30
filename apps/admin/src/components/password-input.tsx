import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { ComponentProps } from "react";
import { IconButton, Input } from "@joymusic/ui";
import { useT } from "../i18n";

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "trailing">) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <IconButton
          size="sm"
          label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          icon={
            visible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )
          }
          onClick={() => setVisible((value) => !value)}
          tabIndex={-1}
        />
      }
    />
  );
}
