export type JoyLocale = "uz" | "ru" | "en";

export const joyLocales: readonly JoyLocale[] = ["uz", "ru", "en"];

export const defaultHeadline = "Scan · Order · Dance";

export const localizedHeadlines: Record<JoyLocale, string> = {
  en: defaultHeadline,
  ru: "Сканируй · Заказывай · Танцуй",
  uz: "Skanerla · Buyurtma ber · Raqsga tush",
};

export const tableWords: Record<JoyLocale, string> = {
  uz: "Stol",
  ru: "Стол",
  en: "Table",
};

export const posterSubtitles: Record<JoyLocale, string> = {
  en: "Request your song from the DJ",
  ru: "Закажи песню у диджея",
  uz: "DJdan qoʻshiq buyurtma qiling",
};

export const stepLabels: Record<JoyLocale, [string, string, string]> = {
  en: ["Scan the code", "Pick a track", "Enjoy the night"],
  ru: ["Сканируй код", "Выбери трек", "Наслаждайся"],
  uz: ["Kodni skanerlang", "Trek tanlang", "Zavqlaning"],
};

export const brandLabel = "Joy Music";

export function formatTableLabel(locale: JoyLocale, table: string | number): string {
  return `${tableWords[locale]} ${table}`;
}

export function resolveHeadline(headline: string | false | undefined, locale?: JoyLocale): string {
  if (headline === false) return "";
  if (headline !== undefined) return headline;
  return locale ? localizedHeadlines[locale] : defaultHeadline;
}
