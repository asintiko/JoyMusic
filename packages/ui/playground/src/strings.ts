import type { Locale } from "@joymusic/shared";

export interface Strings {
  venueName: string;
  venueCity: string;
  nowPlaying: string;
  progress: string;
  upNext: string;
  yourRequest: string;
  mine: string;
  searchPlaceholder: string;
  clearSearch: string;
  request: string;
  requested: string;
  requestByText: string;
  cantFind: string;
  recent: string;
  found: string;
  transliterated: string;
  tableLabel: (n: number) => string;
  dedicationFor: (name: string) => string;
  dedicationSample: string;
  note1: string;
  note2: string;
  ago: (n: number) => string;
  votes: string;
  explicit: string;
  navSearch: string;
  navQueue: string;
  navMine: string;
  tvOrder: string;
  tvScan: string;
  tvOpen: string;
  tvDedications: string;
  tvUpNext: string;
  tvHint: string;
  djIncoming: string;
  djQueue: string;
  djNow: string;
  djAccept: string;
  djDecline: string;
  djLater: string;
  djNew: string;
  djAll: string;
  djRequestsOpen: string;
  djSession: string;
  djTracks: (n: number) => string;
  djPlayNow: string;
  djRemove: string;
  djRecentlyPlayed: string;
  djHotkeys: string;
  djSearchAction: string;
  djReorder: string;
  hwLink: string;
  hwSync: string;
  hwLatency: string;
  hwRealtime: string;
  hwCatalog: string;
  cmdTitle: string;
  cmdPlaceholder: string;
  cmdEmpty: string;
  cmdNavigate: string;
  cmdSelect: string;
  cmdClose: string;
  adminNav: {
    overview: string;
    venues: string;
    qr: string;
    djs: string;
    sessions: string;
    moderation: string;
    analytics: string;
    branding: string;
    billing: string;
    audit: string;
  };
  adminGroupOperate: string;
  adminGroupInsight: string;
  adminGroupAccount: string;
  adminTitle: string;
  adminSubtitle: string;
  adminNewVenue: string;
  adminRange: { d7: string; d30: string; d90: string };
  kpiRequests: string;
  kpiGuests: string;
  kpiScans: string;
  kpiDecline: string;
  chartHours: string;
  chartHoursNote: string;
  topTracks: string;
  colVenue: string;
  colCity: string;
  colTheme: string;
  colDj: string;
  colRequests: string;
  colStatus: string;
  colTrend: string;
  statusLive: string;
  statusIdle: string;
  statusPaused: string;
  venuesTable: string;
  themeNames: { club: string; lounge: string; cafe: string };
  emptySearchTitle: string;
  emptySearchText: string;
  emptyQueueTitle: string;
  emptyQueueText: string;
  emptyInboxTitle: string;
  emptyInboxText: string;
  emptyClosedTitle: string;
  emptyClosedText: string;
  emptyOfflineTitle: string;
  emptyOfflineText: string;
  emptyQrTitle: string;
  emptyQrText: string;
  emptyErrorTitle: string;
  emptyErrorText: string;
  toastQueued: string;
  toastQueuedText: string;
  toastDeclined: string;
  dialogTitle: string;
  dialogText: string;
  cancel: string;
  confirm: string;
  sheetTitle: string;
  sheetText: string;
  fieldDedication: string;
  fieldNote: string;
  fieldTable: string;
  close: string;
}

const uz: Strings = {
  venueName: "Nomad Lounge",
  venueCity: "Toshkent",
  nowPlaying: "Hozir chalinmoqda",
  progress: "Trek jarayoni",
  upNext: "Navbatda keyingilar",
  yourRequest: "Sizning buyurtmangiz",
  mine: "Sizniki",
  searchPlaceholder: "Qoʻshiq yoki ijrochi qidiring",
  clearSearch: "Qidiruvni tozalash",
  request: "Buyurtma berish",
  requested: "Navbatga qoʻshildi",
  requestByText: "Matn bilan buyurtma",
  cantFind: "Topa olmadingizmi? Ijrochi va nomini yozing, DJ oʻzi topadi.",
  recent: "Oxirgi qidiruvlar",
  found: "Topildi",
  transliterated: "Shahzoda ↔ Шахзода",
  tableLabel: (n) => `Stol ${n}`,
  dedicationFor: (name) => `${name} uchun`,
  dedicationSample: "tugʻilgan kun bilan!",
  note1: "Iltimos, kechroq qoʻying",
  note2: "Bu bizning qoʻshigʻimiz!",
  ago: (n) => `${n} daq oldin`,
  votes: "ovoz",
  explicit: "Qopol soʻzlar",
  navSearch: "Qidiruv",
  navQueue: "Navbat",
  navMine: "Buyurtmalarim",
  tvOrder: "Trek buyurtma qiling",
  tvScan: "QR-kodni skanerlang",
  tvOpen: "Buyurtmalar ochiq",
  tvDedications: "Bagʻishlovlar",
  tvUpNext: "Keyingisi",
  tvHint: "Kamerani yoʻnaltiring, ilova oʻrnatish shart emas",
  djIncoming: "Kiruvchi buyurtmalar",
  djQueue: "Navbat",
  djNow: "Hozir chalinmoqda",
  djAccept: "Qabul qilish",
  djDecline: "Rad etish",
  djLater: "Keyinroq",
  djNew: "Yangi",
  djAll: "Hammasi",
  djRequestsOpen: "Buyurtmalar ochiq",
  djSession: "Sessiya",
  djTracks: (n) => `${n} ta trek`,
  djPlayNow: "Hozir qoʻyish",
  djRemove: "Olib tashlash",
  djRecentlyPlayed: "Yaqinda chalingan",
  djHotkeys: "Tezkor tugmalar",
  djSearchAction: "Buyruqlar",
  djReorder: "Tartibni oʻzgartirish",
  hwLink: "Pro DJ Link ulangan",
  hwSync: "Rekordbox bilan sinxron",
  hwLatency: "Kechikish",
  hwRealtime: "Real vaqt: onlayn",
  hwCatalog: "Katalog: joyida",
  cmdTitle: "Buyruqlar paneli",
  cmdPlaceholder: "Buyruq yoki trek qidiring…",
  cmdEmpty: "Hech narsa topilmadi",
  cmdNavigate: "harakat",
  cmdSelect: "tanlash",
  cmdClose: "yopish",
  adminNav: {
    overview: "Umumiy koʻrinish",
    venues: "Joylar",
    qr: "QR studiyasi",
    djs: "DJlar",
    sessions: "Sessiyalar",
    moderation: "Moderatsiya",
    analytics: "Tahlil",
    branding: "Brend",
    billing: "Hisob-kitob",
    audit: "Audit jurnali",
  },
  adminGroupOperate: "Boshqaruv",
  adminGroupInsight: "Tahlil",
  adminGroupAccount: "Hisob",
  adminTitle: "Umumiy koʻrinish",
  adminSubtitle: "Oxirgi 7 kun, barcha joylar",
  adminNewVenue: "Yangi joy",
  adminRange: { d7: "7 kun", d30: "30 kun", d90: "90 kun" },
  kpiRequests: "Buyurtmalar",
  kpiGuests: "Noyob mehmonlar",
  kpiScans: "QR skanerlashlar",
  kpiDecline: "Rad etilganlar",
  chartHours: "Soatlar boʻyicha buyurtmalar",
  chartHoursNote: "Eng gavjum vaqt: 23:00",
  topTracks: "Eng koʻp buyurtma qilingan",
  colVenue: "Joy",
  colCity: "Shahar",
  colTheme: "Mavzu",
  colDj: "DJ",
  colRequests: "Buyurtmalar",
  colStatus: "Holat",
  colTrend: "Dinamika",
  statusLive: "Efirda",
  statusIdle: "Kutmoqda",
  statusPaused: "Toʻxtatilgan",
  venuesTable: "Joylar roʻyxati",
  themeNames: { club: "Klub", lounge: "Lounj", cafe: "Kafe" },
  emptySearchTitle: "Hech narsa topilmadi",
  emptySearchText: "Imloni tekshiring yoki matn bilan buyurtma bering.",
  emptyQueueTitle: "Navbat boʻsh",
  emptyQueueText: "Birinchi boʻlib qoʻshiq buyurtma qiling.",
  emptyInboxTitle: "Yangi buyurtmalar yoʻq",
  emptyInboxText: "Mehmonlar QR-kodni skanerlashi bilan bu yerda paydo boʻladi.",
  emptyClosedTitle: "Buyurtmalar vaqtincha yopiq",
  emptyClosedText: "DJ tez orada qayta ochadi.",
  emptyOfflineTitle: "Aloqa yoʻq",
  emptyOfflineText: "Internetni tekshiring. Buyurtmalaringiz saqlanib qoladi.",
  emptyQrTitle: "QR-kodlar hali yoʻq",
  emptyQrText: "Har bir stol uchun alohida kod yarating.",
  emptyErrorTitle: "Nimadir xato ketdi",
  emptyErrorText: "Sahifani yangilang. Muammo davom etsa, bizga yozing.",
  toastQueued: "Buyurtma qabul qilindi",
  toastQueuedText: "Sizning trekingiz navbatda, 4-oʻrin.",
  toastDeclined: "DJ bu trekni rad etdi",
  dialogTitle: "Buyurtmani bekor qilasizmi?",
  dialogText: "Trek navbatdan olib tashlanadi, ovozlar yoʻqoladi.",
  cancel: "Bekor qilish",
  confirm: "Ha, bekor qilish",
  sheetTitle: "Buyurtma berish",
  sheetText: "DJ buyurtmani koʻrib chiqadi va navbatga qoʻshadi.",
  fieldDedication: "Kimga bagʻishlaysiz?",
  fieldNote: "DJ uchun izoh",
  fieldTable: "Stol raqami",
  close: "Yopish",
};

const ru: Strings = {
  venueName: "Nomad Lounge",
  venueCity: "Ташкент",
  nowPlaying: "Играет сейчас",
  progress: "Прогресс трека",
  upNext: "Дальше в очереди",
  yourRequest: "Ваш заказ",
  mine: "Ваш",
  searchPlaceholder: "Найдите трек или исполнителя",
  clearSearch: "Очистить поиск",
  request: "Заказать",
  requested: "Добавлено в очередь",
  requestByText: "Заказ текстом",
  cantFind: "Не нашли? Напишите исполнителя и название, диджей найдёт сам.",
  recent: "Недавние запросы",
  found: "Найдено",
  transliterated: "Шахзода ↔ Shahzoda",
  tableLabel: (n) => `Стол ${n}`,
  dedicationFor: (name) => `Для ${name}`,
  dedicationSample: "с днём рождения!",
  note1: "Поставьте, пожалуйста, попозже",
  note2: "Это наша песня!",
  ago: (n) => `${n} мин назад`,
  votes: "голосов",
  explicit: "Нецензурная лексика",
  navSearch: "Поиск",
  navQueue: "Очередь",
  navMine: "Мои заказы",
  tvOrder: "Закажи трек",
  tvScan: "Наведи камеру на QR-код",
  tvOpen: "Заказы открыты",
  tvDedications: "Посвящения",
  tvUpNext: "Дальше",
  tvHint: "Приложение не нужно, всё откроется в браузере",
  djIncoming: "Входящие заказы",
  djQueue: "Очередь",
  djNow: "Играет сейчас",
  djAccept: "Принять",
  djDecline: "Отклонить",
  djLater: "Позже",
  djNew: "Новые",
  djAll: "Все",
  djRequestsOpen: "Приём заказов",
  djSession: "Сессия",
  djTracks: (n) => `${n} треков`,
  djPlayNow: "Играть сейчас",
  djRemove: "Убрать",
  djRecentlyPlayed: "Недавно сыграно",
  djHotkeys: "Горячие клавиши",
  djSearchAction: "Команды",
  djReorder: "Перетащить",
  hwLink: "Pro DJ Link подключён",
  hwSync: "Синхронизация с Rekordbox",
  hwLatency: "Задержка",
  hwRealtime: "Realtime: онлайн",
  hwCatalog: "Каталог: в норме",
  cmdTitle: "Палитра команд",
  cmdPlaceholder: "Команда или трек…",
  cmdEmpty: "Ничего не найдено",
  cmdNavigate: "выбор",
  cmdSelect: "открыть",
  cmdClose: "закрыть",
  adminNav: {
    overview: "Обзор",
    venues: "Заведения",
    qr: "QR Studio",
    djs: "Диджеи",
    sessions: "Сессии",
    moderation: "Модерация",
    analytics: "Аналитика",
    branding: "Брендинг",
    billing: "Биллинг",
    audit: "Журнал аудита",
  },
  adminGroupOperate: "Управление",
  adminGroupInsight: "Данные",
  adminGroupAccount: "Аккаунт",
  adminTitle: "Обзор",
  adminSubtitle: "Последние 7 дней, все заведения",
  adminNewVenue: "Новое заведение",
  adminRange: { d7: "7 дней", d30: "30 дней", d90: "90 дней" },
  kpiRequests: "Заказы",
  kpiGuests: "Уникальные гости",
  kpiScans: "Сканирования QR",
  kpiDecline: "Отклонено",
  chartHours: "Заказы по часам",
  chartHoursNote: "Пик: 23:00",
  topTracks: "Самые заказываемые",
  colVenue: "Заведение",
  colCity: "Город",
  colTheme: "Тема",
  colDj: "Диджей",
  colRequests: "Заказы",
  colStatus: "Статус",
  colTrend: "Динамика",
  statusLive: "В эфире",
  statusIdle: "Ожидает",
  statusPaused: "На паузе",
  venuesTable: "Список заведений",
  themeNames: { club: "Клуб", lounge: "Лаунж", cafe: "Кафе" },
  emptySearchTitle: "Ничего не нашли",
  emptySearchText: "Проверьте написание или закажите текстом.",
  emptyQueueTitle: "Очередь пуста",
  emptyQueueText: "Закажите первый трек вечера.",
  emptyInboxTitle: "Новых заказов нет",
  emptyInboxText: "Они появятся здесь, как только гости отсканируют QR-код.",
  emptyClosedTitle: "Приём заказов закрыт",
  emptyClosedText: "Диджей скоро откроет его снова.",
  emptyOfflineTitle: "Нет связи",
  emptyOfflineText: "Проверьте интернет. Ваши заказы сохранятся.",
  emptyQrTitle: "QR-кодов пока нет",
  emptyQrText: "Создайте отдельный код для каждого стола.",
  emptyErrorTitle: "Что-то пошло не так",
  emptyErrorText: "Обновите страницу. Если не помогло, напишите нам.",
  toastQueued: "Заказ принят",
  toastQueuedText: "Ваш трек в очереди, место 4.",
  toastDeclined: "Диджей отклонил этот трек",
  dialogTitle: "Отменить заказ?",
  dialogText: "Трек уберут из очереди, голоса пропадут.",
  cancel: "Не отменять",
  confirm: "Да, отменить",
  sheetTitle: "Заказ трека",
  sheetText: "Диджей посмотрит заказ и добавит его в очередь.",
  fieldDedication: "Кому посвящаете?",
  fieldNote: "Заметка для диджея",
  fieldTable: "Номер стола",
  close: "Закрыть",
};

const en: Strings = {
  venueName: "Nomad Lounge",
  venueCity: "Tashkent",
  nowPlaying: "Now playing",
  progress: "Track progress",
  upNext: "Up next in the queue",
  yourRequest: "Your request",
  mine: "Yours",
  searchPlaceholder: "Search a song or artist",
  clearSearch: "Clear search",
  request: "Request",
  requested: "Added to the queue",
  requestByText: "Request by text",
  cantFind: "Can't find it? Type the artist and title, the DJ will do the rest.",
  recent: "Recent searches",
  found: "Found",
  transliterated: "Shahzoda ↔ Шахзода",
  tableLabel: (n) => `Table ${n}`,
  dedicationFor: (name) => `For ${name}`,
  dedicationSample: "happy birthday!",
  note1: "Please play it a bit later",
  note2: "This is our song!",
  ago: (n) => `${n} min ago`,
  votes: "votes",
  explicit: "Explicit",
  navSearch: "Search",
  navQueue: "Queue",
  navMine: "My requests",
  tvOrder: "Request a track",
  tvScan: "Scan to request",
  tvOpen: "Requests open",
  tvDedications: "Dedications",
  tvUpNext: "Up next",
  tvHint: "No app needed, it opens right in your browser",
  djIncoming: "Incoming requests",
  djQueue: "Queue",
  djNow: "Now playing",
  djAccept: "Accept",
  djDecline: "Decline",
  djLater: "Later",
  djNew: "New",
  djAll: "All",
  djRequestsOpen: "Accepting requests",
  djSession: "Session",
  djTracks: (n) => `${n} tracks`,
  djPlayNow: "Play now",
  djRemove: "Remove",
  djRecentlyPlayed: "Recently played",
  djHotkeys: "Hotkeys",
  djSearchAction: "Commands",
  djReorder: "Drag to reorder",
  hwLink: "Pro DJ Link connected",
  hwSync: "Rekordbox sync",
  hwLatency: "Latency",
  hwRealtime: "Realtime: online",
  hwCatalog: "Catalog: healthy",
  cmdTitle: "Command palette",
  cmdPlaceholder: "Type a command or track…",
  cmdEmpty: "No results",
  cmdNavigate: "navigate",
  cmdSelect: "select",
  cmdClose: "close",
  adminNav: {
    overview: "Overview",
    venues: "Venues",
    qr: "QR Studio",
    djs: "DJs",
    sessions: "Sessions",
    moderation: "Moderation",
    analytics: "Analytics",
    branding: "Branding",
    billing: "Billing",
    audit: "Audit log",
  },
  adminGroupOperate: "Operate",
  adminGroupInsight: "Insight",
  adminGroupAccount: "Account",
  adminTitle: "Overview",
  adminSubtitle: "Last 7 days, all venues",
  adminNewVenue: "New venue",
  adminRange: { d7: "7 days", d30: "30 days", d90: "90 days" },
  kpiRequests: "Requests",
  kpiGuests: "Unique guests",
  kpiScans: "QR scans",
  kpiDecline: "Decline rate",
  chartHours: "Requests by hour",
  chartHoursNote: "Peak at 23:00",
  topTracks: "Most requested",
  colVenue: "Venue",
  colCity: "City",
  colTheme: "Theme",
  colDj: "DJ",
  colRequests: "Requests",
  colStatus: "Status",
  colTrend: "Trend",
  statusLive: "Live",
  statusIdle: "Idle",
  statusPaused: "Paused",
  venuesTable: "Venue list",
  themeNames: { club: "Club", lounge: "Lounge", cafe: "Café" },
  emptySearchTitle: "Nothing found",
  emptySearchText: "Check the spelling or request it by text.",
  emptyQueueTitle: "The queue is empty",
  emptyQueueText: "Request the first track of the night.",
  emptyInboxTitle: "No new requests",
  emptyInboxText: "They appear here as soon as guests scan the QR code.",
  emptyClosedTitle: "Requests are closed",
  emptyClosedText: "The DJ will reopen them shortly.",
  emptyOfflineTitle: "No connection",
  emptyOfflineText: "Check your internet. Your requests are safe.",
  emptyQrTitle: "No QR codes yet",
  emptyQrText: "Create a separate code for every table.",
  emptyErrorTitle: "Something went wrong",
  emptyErrorText: "Refresh the page. If it keeps happening, contact us.",
  toastQueued: "Request received",
  toastQueuedText: "Your track is in the queue, position 4.",
  toastDeclined: "The DJ declined this track",
  dialogTitle: "Cancel this request?",
  dialogText: "The track leaves the queue and its votes are lost.",
  cancel: "Keep it",
  confirm: "Yes, cancel",
  sheetTitle: "Request a track",
  sheetText: "The DJ reviews it and adds it to the queue.",
  fieldDedication: "Dedicate to",
  fieldNote: "Note for the DJ",
  fieldTable: "Table number",
  close: "Close",
};

export const strings: Record<Locale, Strings> = { uz, ru, en };
