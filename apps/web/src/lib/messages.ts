import type { Locale } from "@joymusic/shared";

export interface Messages {
  language: string;
  venueLoading: string;
  nowPlaying: string;
  progress: string;
  upNext: string;
  waitingForVotes: string;
  mine: string;
  searchPlaceholder: string;
  searchLabel: string;
  dockSearch: string;
  notOpenTitle: string;
  notOpenText: string;
  clearSearch: string;
  close: string;
  cancel: string;
  back: string;
  request: string;
  requested: string;
  requestByText: string;
  cantFind: string;
  cantFindHint: string;
  recent: string;
  clearRecent: string;
  found: (count: number) => string;
  alsoSearched: string;
  suggestionsLoading: string;
  noResultsTitle: string;
  noResultsText: (query: string) => string;
  searchFailedTitle: string;
  searchFailedText: string;
  retry: string;
  previewPlay: (title: string) => string;
  previewPause: (title: string) => string;
  explicit: string;
  vote: string;
  voted: string;
  votesCount: (count: number) => string;
  myRequests: string;
  myRequestsEmptyTitle: string;
  myRequestsEmptyText: string;
  myRequestsCount: (count: number) => string;
  declinedReason: string;
  mineAccepted: string;
  minePlaying: string;
  mineDeclined: string;
  queuePosition: (position: number) => string;
  viewMine: string;
  inQueueBadge: string;
  dedicationFor: (name: string) => string;
  table: string;
  requestSheetTitle: string;
  requestSheetTrack: string;
  dedicationLabel: string;
  dedicationPlaceholder: string;
  dedicationHelp: string;
  noteLabel: string;
  notePlaceholder: string;
  optional: string;
  submitRequest: string;
  submitVote: string;
  sending: string;
  freeTextTitle: string;
  freeTextText: string;
  freeArtist: string;
  freeArtistPlaceholder: string;
  freeTitle: string;
  freeTitlePlaceholder: string;
  requestSentTitle: string;
  requestSentText: string;
  voteAddedTitle: string;
  voteAddedText: string;
  alreadyVotedTitle: string;
  alreadyVotedText: string;
  closedTitle: string;
  closedText: string;
  noSessionTitle: string;
  noSessionText: string;
  limitTitle: string;
  limitText: (limit: number, minutes: number) => string;
  retryIn: (time: string) => string;
  blockedTitle: string;
  blockedText: string;
  freeTextDisabledTitle: string;
  freeTextDisabledText: string;
  notesDisabledText: string;
  forbiddenTitle: string;
  forbiddenText: string;
  networkTitle: string;
  networkText: string;
  genericTitle: string;
  genericText: string;
  rateLimitedTitle: string;
  rateLimitedText: string;
  bannerClosedTitle: string;
  bannerClosedText: string;
  dockWaitingText: string;
  waitingDjTitle: string;
  waitingDjText: string;
  idleTitle: string;
  idleText: string;
  emptyQueueTitle: string;
  emptyQueueText: string;
  offlineBanner: string;
  offlineRestored: string;
  installTitle: string;
  installText: string;
  installAction: string;
  installIosText: string;
  installDismiss: string;
  venueNotFoundTitle: string;
  venueNotFoundText: string;
  homeTitle: string;
  homeText: string;
  homeHint: string;
  tvOrder: string;
  tvScan: string;
  tvOpen: string;
  tvClosed: string;
  tvDedications: string;
  tvUpNext: string;
  tvHint: string;
  tvIdleTitle: string;
  tvIdleText: string;
  tvNoSessionTitle: string;
  tvNoSessionText: string;
  tvNoRequests: string;
  tvDedicationsEmpty: string;
  tvNow: string;
  tvVotes: (count: number) => string;
}

const uz: Messages = {
  language: "Til",
  venueLoading: "Yuklanmoqda",
  nowPlaying: "Hozir chalinmoqda",
  progress: "Trek jarayoni",
  upNext: "Navbatda keyingilar",
  waitingForVotes: "Ovoz kutmoqda",
  mine: "Sizniki",
  searchPlaceholder: "Qoʻshiq yoki ijrochi qidiring",
  searchLabel: "Qidiruv",
  dockSearch: "Qoʻshiq qidirish",
  notOpenTitle: "Buyurtma yopilgan",
  notOpenText: "Bu qoʻshiq allaqachon chalingan yoki navbatdan chiqarilgan.",
  clearSearch: "Qidiruvni tozalash",
  close: "Yopish",
  cancel: "Bekor qilish",
  back: "Orqaga",
  request: "Buyurtma berish",
  requested: "Buyurtma berilgan",
  requestByText: "Matn bilan buyurtma",
  cantFind: "Topa olmadingizmi?",
  cantFindHint: "Ijrochi va nomini yozing, DJ oʻzi topadi.",
  recent: "Oxirgi qidiruvlar",
  clearRecent: "Tozalash",
  found: (count) => `Topildi · ${count}`,
  alsoSearched: "Qidirildi",
  suggestionsLoading: "Tavsiyalar yuklanmoqda",
  noResultsTitle: "Hech narsa topilmadi",
  noResultsText: (query) =>
    `“${query}” boʻyicha natija yoʻq. Yozilishini oʻzgartiring yoki matn bilan buyurtma bering.`,
  searchFailedTitle: "Qidiruv ishlamayapti",
  searchFailedText: "Katalog bilan aloqa yoʻq. Birozdan keyin qayta urinib koʻring.",
  retry: "Qayta urinish",
  previewPlay: (title) => `${title}: 30 soniyalik namunani tinglash`,
  previewPause: (title) => `${title}: namunani toʻxtatish`,
  explicit: "Qopol soʻzlar",
  vote: "Ovoz berish",
  voted: "Ovoz berildi",
  votesCount: (count) => `${count} ovoz`,
  myRequests: "Buyurtmalarim",
  myRequestsEmptyTitle: "Hali buyurtma yoʻq",
  myRequestsEmptyText: "Qoʻshiq tanlang, DJ navbatga qoʻyadi. Holati shu yerda koʻrinadi.",
  myRequestsCount: (count) => `${count} ta`,
  declinedReason: "DJ izohi",
  mineAccepted: "DJ buyurtmangizni navbatga qoʻydi",
  minePlaying: "Sizning qoʻshigʻingiz chalinmoqda",
  mineDeclined: "DJ buyurtmani rad etdi",
  queuePosition: (position) => `${position}-oʻrin`,
  viewMine: "Koʻrish",
  inQueueBadge: "Navbatda",
  dedicationFor: (name) => `${name} uchun`,
  table: "Stol",
  requestSheetTitle: "Buyurtma",
  requestSheetTrack: "Tanlangan qoʻshiq",
  dedicationLabel: "Kimga bagʻishlaymiz?",
  dedicationPlaceholder: "Masalan, Aziz",
  dedicationHelp: "Qoʻshiq boshlanganda ekranda koʻrinadi",
  noteLabel: "DJ uchun izoh",
  notePlaceholder: "Tugʻilgan kun bilan, iltimos kechroq qoʻying…",
  optional: "ixtiyoriy",
  submitRequest: "Buyurtma berish",
  submitVote: "Ovoz qoʻshish",
  sending: "Yuborilmoqda",
  freeTextTitle: "Matn bilan buyurtma",
  freeTextText: "Qoʻshiq katalogda topilmadimi? Ijrochi va nomini yozing.",
  freeArtist: "Ijrochi",
  freeArtistPlaceholder: "Masalan, Shahzoda",
  freeTitle: "Qoʻshiq nomi",
  freeTitlePlaceholder: "Masalan, Yomgʻir",
  requestSentTitle: "Buyurtma qabul qilindi",
  requestSentText: "DJ koʻrib chiqadi. Holatini “Buyurtmalarim”da kuzating.",
  voteAddedTitle: "Ovozingiz qoʻshildi",
  voteAddedText: "Bu qoʻshiq allaqachon soʻralgan. Ovozingiz hisobga olindi.",
  alreadyVotedTitle: "Siz allaqachon ovoz bergansiz",
  alreadyVotedText: "Bu qoʻshiq uchun ovoz allaqachon hisobda.",
  closedTitle: "Buyurtmalar hozircha yopiq",
  closedText: "DJ buyurtmalarni vaqtincha toʻxtatdi. Birozdan keyin qayta urinib koʻring.",
  noSessionTitle: "DJ hali boshlamadi",
  noSessionText: "Sessiya boshlanishi bilan buyurtma berishingiz mumkin.",
  limitTitle: "Buyurtmalar limiti tugadi",
  limitText: (limit, minutes) => `${minutes} daqiqada ${limit} tagacha buyurtma berish mumkin.`,
  retryIn: (time) => `Yana ${time} dan keyin`,
  blockedTitle: "Matn qabul qilinmadi",
  blockedText: "Boshqacha yozib koʻring. Odobli soʻzlar bilan.",
  freeTextDisabledTitle: "Matn bilan buyurtma yopiq",
  freeTextDisabledText: "Bu joyda faqat katalogdan tanlash mumkin.",
  notesDisabledText: "Bu joyda izoh va bagʻishlov yozib boʻlmaydi.",
  forbiddenTitle: "Bu qurilma uchun yopiq",
  forbiddenText: "Buyurtma berib boʻlmaydi. DJ bilan gaplashing.",
  networkTitle: "Aloqa yoʻq",
  networkText: "Internetni tekshirib, qayta urinib koʻring.",
  genericTitle: "Nimadir xato ketdi",
  genericText: "Buyurtma yuborilmadi. Birozdan keyin qayta urinib koʻring.",
  rateLimitedTitle: "Juda tez",
  rateLimitedText: "Biroz kuting va qayta urinib koʻring.",
  bannerClosedTitle: "Buyurtmalar yopiq",
  bannerClosedText: "DJ vaqtincha toʻxtatdi",
  dockWaitingText: "Sessiya boshlanganda ochiladi",
  waitingDjTitle: "DJ hali yoʻq",
  waitingDjText:
    "Sessiya boshlanishi bilan bu yerda chalinayotgan qoʻshiq va navbat paydo boʻladi.",
  idleTitle: "Keyingi trek tanlanmoqda",
  idleText: "DJ hozir keyingi qoʻshiqni tayyorlamoqda.",
  emptyQueueTitle: "Navbat boʻsh",
  emptyQueueText: "Birinchi buyurtmani siz bering.",
  offlineBanner: "Aloqa yoʻq, qayta ulanmoqda",
  offlineRestored: "Aloqa tiklandi",
  installTitle: "Bosh ekranga qoʻshing",
  installText: "Keyingi safar bir bosishda oching.",
  installAction: "Qoʻshish",
  installIosText: "Ulashish tugmasini bosing, soʻng “Bosh ekranga qoʻshish”ni tanlang.",
  installDismiss: "Keyinroq",
  venueNotFoundTitle: "Joy topilmadi",
  venueNotFoundText: "QR-kodni qayta skanerlang yoki havolani tekshiring.",
  homeTitle: "Qoʻshiqni DJdan buyurtma qiling",
  homeText: "Stolingizdagi QR-kodni skanerlang, qoʻshiq tanlang, DJ chalib beradi.",
  homeHint: "Ilova oʻrnatish shart emas",
  tvOrder: "Trek buyurtma qiling",
  tvScan: "QR-kodni skanerlang",
  tvOpen: "Buyurtmalar ochiq",
  tvClosed: "Buyurtmalar yopiq",
  tvDedications: "Bagʻishlovlar",
  tvUpNext: "Keyingisi",
  tvHint: "Kamerani yoʻnaltiring, ilova oʻrnatish shart emas",
  tvIdleTitle: "Qoʻshiqni siz tanlang",
  tvIdleText: "Telefon kamerasini QR-kodga yoʻnaltiring",
  tvNoSessionTitle: "DJ tez orada boshlaydi",
  tvNoSessionText: "Buyurtmalar sessiya boshlanganda ochiladi",
  tvNoRequests: "Birinchi buyurtma sizdan",
  tvDedicationsEmpty: "Qoʻshiqni kimgadir bagʻishlang, ismi shu yerda chiqadi",
  tvNow: "Hozir",
  tvVotes: (count) => `${count} ovoz`,
};

const ru: Messages = {
  language: "Язык",
  venueLoading: "Загрузка",
  nowPlaying: "Играет сейчас",
  progress: "Прогресс трека",
  upNext: "Дальше в очереди",
  waitingForVotes: "Ждут голосов",
  mine: "Ваш",
  searchPlaceholder: "Найдите трек или исполнителя",
  searchLabel: "Поиск",
  dockSearch: "Найти трек",
  notOpenTitle: "Заказ закрыт",
  notOpenText: "Этот трек уже сыгран или снят с очереди.",
  clearSearch: "Очистить поиск",
  close: "Закрыть",
  cancel: "Отмена",
  back: "Назад",
  request: "Заказать",
  requested: "Уже заказано",
  requestByText: "Заказ текстом",
  cantFind: "Не нашли?",
  cantFindHint: "Напишите исполнителя и название, диджей найдёт сам.",
  recent: "Недавние запросы",
  clearRecent: "Очистить",
  found: (count) => `Найдено · ${count}`,
  alsoSearched: "Искали",
  suggestionsLoading: "Загружаем подсказки",
  noResultsTitle: "Ничего не нашли",
  noResultsText: (query) =>
    `По запросу «${query}» пусто. Поменяйте написание или закажите текстом.`,
  searchFailedTitle: "Поиск не отвечает",
  searchFailedText: "Нет связи с каталогом. Попробуйте чуть позже.",
  retry: "Повторить",
  previewPlay: (title) => `${title}: послушать фрагмент 30 секунд`,
  previewPause: (title) => `${title}: остановить фрагмент`,
  explicit: "Нецензурная лексика",
  vote: "Голосовать",
  voted: "Голос учтён",
  votesCount: (count) => `${count} гол.`,
  myRequests: "Мои заказы",
  myRequestsEmptyTitle: "Заказов пока нет",
  myRequestsEmptyText: "Выберите трек, диджей поставит его в очередь. Статус появится здесь.",
  myRequestsCount: (count) => `${count}`,
  declinedReason: "Комментарий диджея",
  mineAccepted: "Диджей поставил ваш заказ в очередь",
  minePlaying: "Ваш трек играет прямо сейчас",
  mineDeclined: "Диджей отклонил заказ",
  queuePosition: (position) => `№${position}`,
  viewMine: "Открыть",
  inQueueBadge: "В очереди",
  dedicationFor: (name) => `Для ${name}`,
  table: "Стол",
  requestSheetTitle: "Заказ",
  requestSheetTrack: "Выбранный трек",
  dedicationLabel: "Кому посвящаем?",
  dedicationPlaceholder: "Например, Азиз",
  dedicationHelp: "Покажем на экране, когда трек начнёт играть",
  noteLabel: "Записка диджею",
  notePlaceholder: "С днём рождения, поставьте попозже…",
  optional: "необязательно",
  submitRequest: "Заказать",
  submitVote: "Добавить голос",
  sending: "Отправляем",
  freeTextTitle: "Заказ текстом",
  freeTextText: "Трека нет в каталоге? Напишите исполнителя и название.",
  freeArtist: "Исполнитель",
  freeArtistPlaceholder: "Например, Шахзода",
  freeTitle: "Название трека",
  freeTitlePlaceholder: "Например, Ёмгир",
  requestSentTitle: "Заказ принят",
  requestSentText: "Диджей посмотрит. Следите за статусом в «Мои заказы».",
  voteAddedTitle: "Ваш голос добавлен",
  voteAddedText: "Этот трек уже заказали. Ваш голос учтён.",
  alreadyVotedTitle: "Вы уже голосовали",
  alreadyVotedText: "Голос за этот трек уже учтён.",
  closedTitle: "Заказы пока закрыты",
  closedText: "Диджей приостановил приём заказов. Попробуйте чуть позже.",
  noSessionTitle: "Диджей ещё не начал",
  noSessionText: "Как только начнётся сессия, можно будет заказывать.",
  limitTitle: "Лимит заказов исчерпан",
  limitText: (limit, minutes) => `За ${minutes} мин можно заказать не больше ${limit}.`,
  retryIn: (time) => `Ещё ${time}`,
  blockedTitle: "Текст не прошёл проверку",
  blockedText: "Попробуйте написать иначе, без грубых слов.",
  freeTextDisabledTitle: "Заказ текстом отключён",
  freeTextDisabledText: "В этом заведении можно выбрать только трек из каталога.",
  notesDisabledText: "В этом заведении нельзя добавить записку и посвящение.",
  forbiddenTitle: "Для этого устройства закрыто",
  forbiddenText: "Заказ отправить нельзя. Обратитесь к диджею.",
  networkTitle: "Нет связи",
  networkText: "Проверьте интернет и попробуйте ещё раз.",
  genericTitle: "Что-то пошло не так",
  genericText: "Заказ не отправлен. Попробуйте чуть позже.",
  rateLimitedTitle: "Слишком быстро",
  rateLimitedText: "Подождите немного и повторите.",
  bannerClosedTitle: "Заказы закрыты",
  bannerClosedText: "Диджей приостановил приём",
  dockWaitingText: "Откроется с началом сессии",
  waitingDjTitle: "Диджея пока нет",
  waitingDjText: "Как только начнётся сессия, здесь появятся играющий трек и очередь.",
  idleTitle: "Выбираем следующий трек",
  idleText: "Диджей готовит следующую песню.",
  emptyQueueTitle: "Очередь пуста",
  emptyQueueText: "Сделайте первый заказ.",
  offlineBanner: "Нет связи, переподключаемся",
  offlineRestored: "Связь восстановлена",
  installTitle: "Добавьте на главный экран",
  installText: "В следующий раз откроется в одно касание.",
  installAction: "Добавить",
  installIosText: "Нажмите «Поделиться», затем «На экран Домой».",
  installDismiss: "Позже",
  venueNotFoundTitle: "Заведение не найдено",
  venueNotFoundText: "Отсканируйте QR-код ещё раз или проверьте ссылку.",
  homeTitle: "Закажите песню у диджея",
  homeText: "Отсканируйте QR-код на столе, выберите трек, диджей поставит его.",
  homeHint: "Приложение устанавливать не нужно",
  tvOrder: "Закажи трек",
  tvScan: "Наведи камеру на QR-код",
  tvOpen: "Заказы открыты",
  tvClosed: "Заказы закрыты",
  tvDedications: "Посвящения",
  tvUpNext: "Дальше",
  tvHint: "Приложение не нужно, всё откроется в браузере",
  tvIdleTitle: "Выбирайте музыку сами",
  tvIdleText: "Наведите камеру телефона на QR-код",
  tvNoSessionTitle: "Диджей скоро начнёт",
  tvNoSessionText: "Заказы откроются, когда начнётся сессия",
  tvNoRequests: "Первый заказ за вами",
  tvDedicationsEmpty: "Посвятите трек кому-нибудь, и имя появится здесь",
  tvNow: "Сейчас",
  tvVotes: (count) => `${count} гол.`,
};

const en: Messages = {
  language: "Language",
  venueLoading: "Loading",
  nowPlaying: "Now playing",
  progress: "Track progress",
  upNext: "Up next",
  waitingForVotes: "Waiting for votes",
  mine: "Yours",
  searchPlaceholder: "Search a song or artist",
  searchLabel: "Search",
  dockSearch: "Find a track",
  notOpenTitle: "Request closed",
  notOpenText: "That track was already played or removed from the queue.",
  clearSearch: "Clear search",
  close: "Close",
  cancel: "Cancel",
  back: "Back",
  request: "Request",
  requested: "Already requested",
  requestByText: "Request by text",
  cantFind: "Can’t find it?",
  cantFindHint: "Type the artist and title, the DJ will find it.",
  recent: "Recent searches",
  clearRecent: "Clear",
  found: (count) => `Found · ${count}`,
  alsoSearched: "Also searched",
  suggestionsLoading: "Loading suggestions",
  noResultsTitle: "Nothing found",
  noResultsText: (query) => `No results for “${query}”. Try another spelling or request by text.`,
  searchFailedTitle: "Search is unavailable",
  searchFailedText: "The catalog isn’t responding. Please try again in a moment.",
  retry: "Try again",
  previewPlay: (title) => `${title}: play 30 second preview`,
  previewPause: (title) => `${title}: stop preview`,
  explicit: "Explicit",
  vote: "Vote",
  voted: "Vote counted",
  votesCount: (count) => `${count} ${count === 1 ? "vote" : "votes"}`,
  myRequests: "My requests",
  myRequestsEmptyTitle: "No requests yet",
  myRequestsEmptyText: "Pick a track and the DJ will queue it. Its status shows up here.",
  myRequestsCount: (count) => `${count}`,
  declinedReason: "DJ note",
  mineAccepted: "The DJ queued your request",
  minePlaying: "Your track is playing right now",
  mineDeclined: "The DJ declined the request",
  queuePosition: (position) => `#${position}`,
  viewMine: "View",
  inQueueBadge: "In the queue",
  dedicationFor: (name) => `For ${name}`,
  table: "Table",
  requestSheetTitle: "Request",
  requestSheetTrack: "Selected track",
  dedicationLabel: "Who is it for?",
  dedicationPlaceholder: "For example, Aziz",
  dedicationHelp: "Shown on screen once the track starts playing",
  noteLabel: "Note to the DJ",
  notePlaceholder: "Happy birthday, please play it a bit later…",
  optional: "optional",
  submitRequest: "Request this track",
  submitVote: "Add my vote",
  sending: "Sending",
  freeTextTitle: "Request by text",
  freeTextText: "Not in the catalog? Type the artist and the title.",
  freeArtist: "Artist",
  freeArtistPlaceholder: "For example, Shahzoda",
  freeTitle: "Track title",
  freeTitlePlaceholder: "For example, Yomgir",
  requestSentTitle: "Request received",
  requestSentText: "The DJ will take a look. Follow it in My requests.",
  voteAddedTitle: "Your vote is added",
  voteAddedText: "This track was already requested. Your vote counts.",
  alreadyVotedTitle: "You already voted",
  alreadyVotedText: "Your vote for this track is already counted.",
  closedTitle: "Requests are closed for now",
  closedText: "The DJ paused requests. Please try again in a bit.",
  noSessionTitle: "The DJ hasn’t started yet",
  noSessionText: "You can request tracks as soon as the session begins.",
  limitTitle: "Request limit reached",
  limitText: (limit, minutes) => `You can request up to ${limit} tracks per ${minutes} min.`,
  retryIn: (time) => `Try again in ${time}`,
  blockedTitle: "That text was not accepted",
  blockedText: "Try wording it differently, without rude words.",
  freeTextDisabledTitle: "Text requests are off",
  freeTextDisabledText: "This venue only takes tracks picked from the catalog.",
  notesDisabledText: "This venue doesn’t allow notes or dedications.",
  forbiddenTitle: "Not available on this device",
  forbiddenText: "Requests can’t be sent. Please talk to the DJ.",
  networkTitle: "No connection",
  networkText: "Check your internet and try again.",
  genericTitle: "Something went wrong",
  genericText: "The request was not sent. Please try again in a moment.",
  rateLimitedTitle: "Too fast",
  rateLimitedText: "Wait a little and try again.",
  bannerClosedTitle: "Requests are closed",
  bannerClosedText: "The DJ paused them for now",
  dockWaitingText: "Opens when the session starts",
  waitingDjTitle: "No DJ yet",
  waitingDjText: "As soon as the session starts, the playing track and the queue show up here.",
  idleTitle: "Picking the next track",
  idleText: "The DJ is lining up the next song.",
  emptyQueueTitle: "The queue is empty",
  emptyQueueText: "Make the first request.",
  offlineBanner: "No connection, reconnecting",
  offlineRestored: "Back online",
  installTitle: "Add to your home screen",
  installText: "Next time it opens in one tap.",
  installAction: "Add",
  installIosText: "Tap Share, then choose Add to Home Screen.",
  installDismiss: "Later",
  venueNotFoundTitle: "Venue not found",
  venueNotFoundText: "Scan the QR code again or check the link.",
  homeTitle: "Request a song from the DJ",
  homeText: "Scan the QR code on your table, pick a track, the DJ plays it.",
  homeHint: "No app to install",
  tvOrder: "Request a track",
  tvScan: "Point your camera at the QR code",
  tvOpen: "Requests open",
  tvClosed: "Requests closed",
  tvDedications: "Dedications",
  tvUpNext: "Up next",
  tvHint: "No app needed, it opens in your browser",
  tvIdleTitle: "You pick the music",
  tvIdleText: "Point your phone camera at the QR code",
  tvNoSessionTitle: "The DJ starts soon",
  tvNoSessionText: "Requests open when the session begins",
  tvNoRequests: "Be the first to request",
  tvDedicationsEmpty: "Dedicate a track to someone and their name shows up here",
  tvNow: "Now",
  tvVotes: (count) => `${count} ${count === 1 ? "vote" : "votes"}`,
};

export const messages: Record<Locale, Messages> = { uz, ru, en };
