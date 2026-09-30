import { locales, type Locale } from "@joymusic/shared";
import { Languages } from "lucide-react";
import { useI18n } from "../i18n";
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "./menu";

const names: Record<Locale, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Menu>
      <MenuTrigger
        aria-label={t("common.language")}
        className="focus-ring inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] font-bold text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg data-[state=open]:bg-surface-3"
      >
        <Languages aria-hidden="true" className="size-4" />
        <span className="type-mono text-[12px] uppercase">{locale}</span>
      </MenuTrigger>
      <MenuContent align="end" className="min-w-[180px]">
        <MenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          {locales.map((code) => (
            <MenuRadioItem key={code} value={code}>
              <span className="type-mono w-6 text-[11px] uppercase text-fg-subtle">{code}</span>
              {names[code]}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
