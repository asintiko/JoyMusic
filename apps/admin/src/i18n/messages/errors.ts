import { defineMessages } from "../define";

export const errors = defineMessages({
  "err.network": {
    en: "No connection to the server. Check your network and try again.",
    ru: "Нет связи с сервером. Проверьте сеть и повторите.",
    uz: "Server bilan aloqa yoʻq. Tarmoqni tekshirib, qayta urinib koʻring.",
  },
  "err.invalid_credentials": {
    en: "Wrong email or password.",
    ru: "Неверный email или пароль.",
    uz: "Email yoki parol notoʻgʻri.",
  },
  "err.email_taken": {
    en: "This email is already registered.",
    ru: "Этот email уже зарегистрирован.",
    uz: "Bu email allaqachon roʻyxatdan oʻtgan.",
  },
  "err.invite_invalid": {
    en: "The invitation is invalid or has expired.",
    ru: "Приглашение недействительно или истекло.",
    uz: "Taklif yaroqsiz yoki muddati tugagan.",
  },
  "err.slug_taken": {
    en: "This address is already taken by another venue.",
    ru: "Этот адрес уже занят другим заведением.",
    uz: "Bu manzil boshqa muassasa tomonidan band qilingan.",
  },
  "err.last_owner": {
    en: "The organization must keep at least one owner. Promote someone else first.",
    ru: "В организации должен остаться хотя бы один владелец. Сначала назначьте другого.",
    uz: "Tashkilotda kamida bitta egasi qolishi kerak. Avval boshqasini tayinlang.",
  },
  "err.owner_only": {
    en: "Only owners can manage owners.",
    ru: "Управлять владельцами могут только владельцы.",
    uz: "Egalarni faqat egalar boshqara oladi.",
  },
  "err.forbidden": {
    en: "You do not have permission for this action.",
    ru: "Недостаточно прав для этого действия.",
    uz: "Bu amal uchun ruxsatingiz yetarli emas.",
  },
  "err.not_found": {
    en: "The item was not found. It may have been deleted.",
    ru: "Элемент не найден. Возможно, его уже удалили.",
    uz: "Element topilmadi. Balki oʻchirilgandir.",
  },
  "err.conflict": {
    en: "The action conflicts with the current state. Refresh and try again.",
    ru: "Действие конфликтует с текущим состоянием. Обновите страницу и повторите.",
    uz: "Amal joriy holatga zid. Sahifani yangilab, qayta urinib koʻring.",
  },
  "err.rate_limited": {
    en: "Too many attempts. Try again in {seconds} seconds.",
    ru: "Слишком много попыток. Повторите через {seconds} с.",
    uz: "Urinishlar juda koʻp. {seconds} soniyadan keyin qayta urinib koʻring.",
  },
  "err.validation": {
    en: "Some values are not accepted. Check the fields and try again.",
    ru: "Часть значений не принята. Проверьте поля и повторите.",
    uz: "Baʼzi qiymatlar qabul qilinmadi. Maydonlarni tekshirib, qayta urinib koʻring.",
  },
  "err.unauthorized": {
    en: "Your session has expired. Please sign in again.",
    ru: "Сессия истекла. Войдите снова.",
    uz: "Seans muddati tugadi. Qaytadan kiring.",
  },
  "err.server": {
    en: "The server had a problem. Try again in a moment.",
    ru: "На сервере возникла ошибка. Повторите чуть позже.",
    uz: "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib koʻring.",
  },
  "err.unknown": {
    en: "Something went wrong. Try again.",
    ru: "Что-то пошло не так. Повторите попытку.",
    uz: "Nimadir xato ketdi. Qayta urinib koʻring.",
  },
  "error.generic.title": {
    en: "Could not load this",
    ru: "Не удалось загрузить",
    uz: "Yuklab boʻlmadi",
  },
  "error.network.title": { en: "No connection", ru: "Нет связи", uz: "Aloqa yoʻq" },
  "error.boundary.title": {
    en: "This screen crashed",
    ru: "Этот экран сломался",
    uz: "Bu ekran ishdan chiqdi",
  },
  "error.boundary.description": {
    en: "The rest of the panel still works. Try again or switch to another section.",
    ru: "Остальная панель работает. Повторите или перейдите в другой раздел.",
    uz: "Panelning qolgan qismi ishlayapti. Qayta urining yoki boshqa boʻlimga oʻting.",
  },
  "form.required": { en: "Required field", ru: "Обязательное поле", uz: "Majburiy maydon" },
  "form.email": {
    en: "Enter a valid email",
    ru: "Введите корректный email",
    uz: "Toʻgʻri email kiriting",
  },
  "form.passwordShort": {
    en: "At least 8 characters",
    ru: "Не меньше 8 символов",
    uz: "Kamida 8 ta belgi",
  },
  "form.tooShort": {
    en: "At least {min} characters",
    ru: "Не меньше {min} символов",
    uz: "Kamida {min} ta belgi",
  },
  "form.tooLong": {
    en: "At most {max} characters",
    ru: "Не больше {max} символов",
    uz: "Koʻpi bilan {max} ta belgi",
  },
  "form.integer": { en: "Whole number only", ru: "Только целое число", uz: "Faqat butun son" },
  "form.range": { en: "From {min} to {max}", ru: "От {min} до {max}", uz: "{min} dan {max} gacha" },
  "form.url": {
    en: "Enter a link starting with https://",
    ru: "Введите ссылку, начинающуюся с https://",
    uz: "https:// bilan boshlanadigan havola kiriting",
  },
});
