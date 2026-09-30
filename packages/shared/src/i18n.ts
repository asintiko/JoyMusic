import type { Locale, RequestStatus, suggestionSectionIds } from "./domain";

export const requestStatusLabels: Record<Locale, Record<RequestStatus, string>> = {
  uz: {
    pending: "Kutilmoqda",
    accepted: "Navbatda",
    playing: "Hozir chalinmoqda",
    played: "Chalindi",
    declined: "Rad etildi",
    expired: "Muddati tugadi",
  },
  ru: {
    pending: "Ожидает",
    accepted: "В очереди",
    playing: "Играет сейчас",
    played: "Сыграно",
    declined: "Отклонено",
    expired: "Истёк срок",
  },
  en: {
    pending: "Pending",
    accepted: "Queued",
    playing: "Playing now",
    played: "Played",
    declined: "Declined",
    expired: "Expired",
  },
};

export const suggestionTitles: Record<
  Locale,
  Record<(typeof suggestionSectionIds)[number], string>
> = {
  uz: {
    trending_here: "Bu yerda mashhur",
    dj_picks: "DJ tanlovi",
    uz_hits: "Oʻzbek xitlari",
    ru_pop: "Rus popi",
    club: "Klub musiqasi",
    slow: "Sekin qoʻshiqlar",
    birthday: "Tugʻilgan kun",
  },
  ru: {
    trending_here: "Популярно здесь",
    dj_picks: "Выбор диджея",
    uz_hits: "Узбекские хиты",
    ru_pop: "Русский поп",
    club: "Клубное",
    slow: "Медляки",
    birthday: "День рождения",
  },
  en: {
    trending_here: "Trending here",
    dj_picks: "DJ picks",
    uz_hits: "Uzbek hits",
    ru_pop: "Russian pop",
    club: "Club",
    slow: "Slow songs",
    birthday: "Birthday",
  },
};

export function pickLocale(candidate: string | null | undefined, fallback: Locale): Locale {
  const base = candidate?.toLowerCase().split(/[-_]/)[0];
  if (base === "uz" || base === "ru" || base === "en") return base;
  return fallback;
}
