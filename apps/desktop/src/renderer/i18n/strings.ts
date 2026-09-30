import type { AdapterState } from "@joymusic/dj-bridge";
import type { Locale, NowPlayingSource } from "@joymusic/shared";
import type { RealtimeConnectionStatus, UpdateStatus } from "../../common/bridge";
import type { AdapterId, StageTheme } from "../../common/settings";

export type ErrorStrings = { generic: string; network: string; rate_limited: string } & Record<
  string,
  string
>;

export interface Strings {
  appName: string;
  cancel: string;
  close: string;
  back: string;
  refresh: string;
  choose: string;
  clear: string;
  apply: string;
  language: string;
  languageBody: string;
  languageNames: Record<Locale, string>;
  errors: ErrorStrings;
  loginTitle: string;
  loginSubtitle: string;
  loginBrowser: string;
  loginBrowserWaiting: string;
  loginBrowserHint: string;
  loginBrowserReopen: string;
  loginOr: string;
  loginEmail: string;
  loginPassword: string;
  loginSubmit: string;
  pickerTitle: string;
  pickerSubtitle: (name: string) => string;
  pickerEmpty: string;
  pickerEmptyBody: string;
  sessionActive: string;
  sessionStart: string;
  sessionResume: string;
  sessionConflict: string;
  signOut: string;
  settings: string;
  session: string;
  requestsOpen: string;
  requestsClosed: string;
  openRequests: string;
  commands: string;
  stageOpen: string;
  stageClose: string;
  boothMode: string;
  boothModeBody: string;
  largeTargets: string;
  largeTargetsBody: string;
  endSession: string;
  endSessionTitle: string;
  endSessionBody: string;
  incomingTitle: string;
  incomingNew: string;
  incomingAll: string;
  incomingEmpty: string;
  incomingEmptyBody: string;
  incomingClosed: string;
  incomingClosedBody: string;
  queueTitle: string;
  queueEmpty: string;
  queueEmptyBody: string;
  reorder: string;
  reorderHint: string;
  tracks: (count: number) => string;
  accept: string;
  later: string;
  restore: string;
  decline: string;
  declineTitle: string;
  declineReasonLabel: string;
  declineConfirm: string;
  reasonPlayed: string;
  reasonMissing: string;
  reasonStyle: string;
  playNow: string;
  remove: string;
  pushToAir: string;
  markPlayed: string;
  nowPlaying: string;
  nothingPlaying: string;
  nothingPlayingBody: string;
  progress: string;
  sourceManual: string;
  sourceRequest: string;
  sourceDetected: (label: string) => string;
  sourceNames: Record<NowPlayingSource, string>;
  recentTitle: string;
  recentEmpty: string;
  ago: (minutes: number) => string;
  votes: string;
  dedicationFor: (name: string) => string;
  arrowUp: string;
  arrowDown: string;
  noAdapters: string;
  adapterStates: Record<AdapterState, string>;
  realtimeStates: Record<RealtimeConnectionStatus, string>;
  latency: string;
  midi: string;
  midiDevices: (count: number) => string;
  outboxPending: (count: number) => string;
  offlineTitle: string;
  offlineSaved: (count: number) => string;
  offlineStale: string;
  reconnecting: string;
  syncing: string;
  retryNow: string;
  queuedToast: string;
  paletteTitle: string;
  palettePlaceholder: string;
  paletteEmpty: string;
  paletteNavigate: string;
  paletteSelect: string;
  paletteClose: string;
  paletteAccept: string;
  paletteDecline: string;
  paletteOpenRequests: string;
  paletteCloseRequests: string;
  paletteGroups: {
    requests: string;
    playback: string;
    view: string;
    app: string;
    language: string;
    session: string;
    jump: string;
  };
  settingsTabs: { general: string; hardware: string; midi: string; stage: string; updates: string };
  appearance: string;
  account: string;
  hardwareIntro: string;
  adapterInfo: Record<AdapterId, { title: string; body: string }>;
  detectedNow: string;
  seratoFolder: string;
  seratoFolderHint: string;
  virtualDjFolder: string;
  virtualDjFolderHint: string;
  virtualDjFile: string;
  virtualDjFileHint: string;
  traktorPort: string;
  traktorPassword: string;
  traktorSteps: (port: number) => string[];
  textFilePath: string;
  textFileTemplate: string;
  textFileTemplateHint: string;
  simulatorNext: string;
  midiTitle: string;
  midiBody: string;
  midiLeds: string;
  midiLedsBody: string;
  midiUnsupported: string;
  midiDenied: string;
  midiDevicesTitle: string;
  midiNoDevices: string;
  connected: string;
  disconnected: string;
  midiPresets: string;
  midiPresetsBody: string;
  unverified: string;
  detected: string;
  midiUnverifiedNote: string;
  midiMapping: string;
  midiMappingBody: string;
  midiActions: Record<string, string>;
  unassigned: string;
  learn: string;
  midiPress: string;
  stageWindow: string;
  stageWindowBody: string;
  stageDisplay: string;
  stageDisplayAuto: string;
  primaryDisplay: string;
  stageNeedsSession: string;
  stageTheme: string;
  stageThemeBody: string;
  stageThemes: Record<StageTheme, string>;
  stageAutoOpen: string;
  stageAutoOpenBody: string;
  updatesTitle: string;
  updatesBody: string;
  updatesDisabled: string;
  updateStates: Record<UpdateStatus, string>;
  currentVersion: string;
  newVersion: string;
  autoCheck: string;
  checkUpdates: string;
  installUpdate: string;
  stageWaiting: string;
  stagePillOpen: string;
  stagePillClosed: string;
  stageUpNext: string;
  stageOrder: string;
  stageScan: string;
  stageHint: string;
  stageDedications: string;
  stageIdleEyebrow: string;
  stageIdleTitle: string;
  stageIdleBody: string;
}

const en: Strings = {
  appName: "Joy Music",
  cancel: "Cancel",
  close: "Close",
  back: "Back",
  refresh: "Refresh",
  choose: "Choose",
  clear: "Clear",
  apply: "Apply",
  language: "Language",
  languageBody: "Applies to the console and the stage screen.",
  languageNames: { uz: "Oʻzbekcha", ru: "Русский", en: "English" },
  errors: {
    generic: "Could not complete the action. Try again.",
    network: "Cannot reach the server",
    invalid_credentials: "Wrong email or password",
    rate_limited: "Too many attempts. Try again in a few minutes.",
    session_expired: "Your session expired. Sign in again.",
    invalid_state: "The sign-in link is invalid or expired. Start again.",
    access_denied: "Sign-in was cancelled in the browser.",
    unauthorized: "Sign in again to continue",
    forbidden: "You do not have access to this",
    not_found: "Not found. It may have been removed already",
    conflict: "This request already changed. The list is refreshed",
    validation_failed: "The server rejected this data",
    no_active_session: "There is no active session",
    internal: "Server error. Try again shortly",
  },
  loginTitle: "Sign in to the DJ console",
  loginSubtitle: "Manage requests, the queue and the venue screen.",
  loginBrowser: "Continue in browser",
  loginBrowserWaiting: "Waiting for confirmation in the browser",
  loginBrowserHint: "Approve the sign-in in the window that just opened, then return here.",
  loginBrowserReopen: "Open the browser again",
  loginOr: "or use email",
  loginEmail: "Email",
  loginPassword: "Password",
  loginSubmit: "Sign in",
  pickerTitle: "Choose a venue",
  pickerSubtitle: (name) => (name ? `Signed in as ${name}` : "Pick where you play tonight"),
  pickerEmpty: "No venues yet",
  pickerEmptyBody: "Ask the venue owner to add you as a DJ.",
  sessionActive: "Session running",
  sessionStart: "Start session",
  sessionResume: "Resume session",
  sessionConflict: "Another DJ is already running a session at this venue.",
  signOut: "Sign out",
  settings: "Settings",
  session: "Session",
  requestsOpen: "Accepting requests",
  requestsClosed: "Requests paused",
  openRequests: "Accept requests",
  commands: "Commands",
  stageOpen: "Open stage screen",
  stageClose: "Close stage screen",
  boothMode: "Booth mode",
  boothModeBody: "Ultra-dark interface that does not light up the booth.",
  largeTargets: "Large targets",
  largeTargetsBody: "Bigger buttons and text for a dim, shaky booth.",
  endSession: "End session",
  endSessionTitle: "End this session?",
  endSessionBody: "Open requests will expire and the queue will close for guests.",
  incomingTitle: "Incoming requests",
  incomingNew: "New",
  incomingAll: "All",
  incomingEmpty: "No new requests",
  incomingEmptyBody: "Guest requests appear here the moment they are sent.",
  incomingClosed: "Requests are paused",
  incomingClosedBody: "Turn requests back on to receive new ones.",
  queueTitle: "Queue",
  queueEmpty: "The queue is empty",
  queueEmptyBody: "Accepted requests line up here. Drag to change the order.",
  reorder: "Drag to reorder",
  reorderHint: "Drag to reorder, or Alt with the arrow keys",
  tracks: (count) => (count === 1 ? "1 track" : `${count} tracks`),
  accept: "Accept",
  later: "Later",
  restore: "Back to new",
  decline: "Decline",
  declineTitle: "Decline this request",
  declineReasonLabel: "Reason for the guest (optional)",
  declineConfirm: "Decline",
  reasonPlayed: "Already played tonight",
  reasonMissing: "I do not have this track",
  reasonStyle: "Does not fit the set",
  playNow: "Play now",
  remove: "Remove from queue",
  pushToAir: "Push to air",
  markPlayed: "Mark as played",
  nowPlaying: "Now playing",
  nothingPlaying: "Nothing is playing",
  nothingPlayingBody: "Play a track in your DJ software. It shows up here on its own.",
  progress: "Track progress",
  sourceManual: "Marked by hand",
  sourceRequest: "From a guest request",
  sourceDetected: (label) => `Detected from ${label}`,
  sourceNames: {
    manual: "manual",
    request: "request",
    prolink: "Pro DJ Link",
    stagelinq: "StageLinQ",
    virtualdj: "VirtualDJ",
    serato: "Serato",
    traktor: "Traktor",
    rekordbox: "Rekordbox",
  },
  recentTitle: "Recently played",
  recentEmpty: "Nothing played yet",
  ago: (minutes) => (minutes < 1 ? "just now" : `${minutes} min ago`),
  votes: "votes",
  dedicationFor: (name) => `For ${name}`,
  arrowUp: "Arrow up",
  arrowDown: "Arrow down",
  noAdapters: "No hardware source enabled",
  adapterStates: {
    active: "connected",
    waiting: "waiting",
    starting: "starting",
    unavailable: "unavailable",
    error: "error",
    stopped: "off",
  },
  realtimeStates: {
    connecting: "Realtime: connecting",
    open: "Realtime: online",
    closed: "Realtime: offline",
  },
  latency: "Latency",
  midi: "MIDI",
  midiDevices: (count) => (count === 0 ? "no device" : `${count} connected`),
  outboxPending: (count) => `${count} waiting to send`,
  offlineTitle: "No connection",
  offlineSaved: (count) =>
    `Your actions are saved (${count}) and will be sent when the connection returns.`,
  offlineStale: "The list may be out of date. Reconnecting.",
  reconnecting: "Reconnecting",
  syncing: "Sending saved actions",
  retryNow: "Retry now",
  queuedToast: "Saved offline. It will be sent when the connection returns.",
  paletteTitle: "Command palette",
  palettePlaceholder: "Type a command or a track",
  paletteEmpty: "Nothing found",
  paletteNavigate: "Navigate",
  paletteSelect: "Select",
  paletteClose: "Close",
  paletteAccept: "Accept selected request",
  paletteDecline: "Decline selected request",
  paletteOpenRequests: "Accept requests",
  paletteCloseRequests: "Pause requests",
  paletteGroups: {
    requests: "Requests",
    playback: "Playback",
    view: "View",
    app: "App",
    language: "Language",
    session: "Session",
    jump: "Jump to request",
  },
  settingsTabs: {
    general: "General",
    hardware: "Hardware",
    midi: "MIDI",
    stage: "Stage",
    updates: "Updates",
  },
  appearance: "Appearance",
  account: "Account",
  hardwareIntro:
    "Joy Music reads what you play from your DJ software. Turn on the source you use. Nothing is sent to guests until a track is detected.",
  adapterInfo: {
    serato: {
      title: "Serato DJ",
      body: "Reads the newest session file from the Serato history folder.",
    },
    virtualdj: {
      title: "VirtualDJ",
      body: "Reads the history folder, or a now-playing text file if you set one.",
    },
    traktor: {
      title: "Traktor (Icecast)",
      body: "Traktor broadcasts the track title to a local port. Nothing is streamed anywhere else.",
    },
    textfile: {
      title: "Text file",
      body: "Any tool that writes the current track to a file: OBS scripts, Rekordbox exports, custom scripts.",
    },
    prolink: {
      title: "Pioneer Pro DJ Link",
      body: "CDJ and XDJ players on the same network. Needs the optional prolink-connect module.",
    },
    stagelinq: {
      title: "Denon StageLinQ",
      body: "Denon and Engine DJ hardware on the same network. Needs the optional stagelinq module.",
    },
    simulator: {
      title: "Simulator",
      body: "Plays a scripted set of tracks to try the console without any equipment.",
    },
  },
  detectedNow: "Detected now",
  seratoFolder: "Serato folder",
  seratoFolderHint: "The _Serato_ folder. Leave empty to use the default location.",
  virtualDjFolder: "History folder",
  virtualDjFolderHint: "Leave empty to use the default VirtualDJ history folder.",
  virtualDjFile: "Now-playing file (optional)",
  virtualDjFileHint: "A text file VirtualDJ writes on every track change.",
  traktorPort: "Port",
  traktorPassword: "Password (optional)",
  traktorSteps: (port) => [
    "In Traktor open Preferences, then Broadcasting.",
    `Set the server address to 127.0.0.1 and the port to ${port}.`,
    "Use the same password here and in Traktor, or leave both empty.",
    "Choose the MP3 format, then press Start Broadcasting.",
  ],
  textFilePath: "File path",
  textFileTemplate: "Template",
  textFileTemplateHint: "Use {artist} and {title}. Example: {artist} - {title}",
  simulatorNext: "Next simulated track",
  midiTitle: "MIDI controller",
  midiBody: "Run the console from pads and encoders on your controller.",
  midiLeds: "LED feedback",
  midiLedsBody: "Pads light up for new requests, the queue and playback.",
  midiUnsupported: "MIDI is not available on this system",
  midiDenied: "MIDI access was blocked",
  midiDevicesTitle: "Devices",
  midiNoDevices: "No MIDI controller found. Plug one in and it appears here.",
  connected: "connected",
  disconnected: "disconnected",
  midiPresets: "Presets",
  midiPresetsBody: "A starting point for popular controllers. Fine-tune with learn mode.",
  unverified: "Unverified",
  detected: "Detected",
  midiUnverifiedNote:
    "Presets are not tested on real devices yet. If a pad does nothing, use learn mode below.",
  midiMapping: "Controls",
  midiMappingBody: "Press Learn, then touch the pad or knob you want to use.",
  midiActions: {
    acceptTop: "Accept request",
    declineTop: "Decline request",
    playNext: "Play next",
    pushToAir: "Push to air",
    markPlayed: "Mark as played",
    toggleRequestsOpen: "Pause or resume requests",
    "moveSelection:1": "Selection down",
    "moveSelection:-1": "Selection up",
  },
  unassigned: "not set",
  learn: "Learn",
  midiPress: "Press a control...",
  stageWindow: "Stage window",
  stageWindowBody:
    "A fullscreen screen for the venue TV. It has no controls and follows the console.",
  stageDisplay: "Display",
  stageDisplayAuto: "Automatic: first external display",
  primaryDisplay: "main",
  stageNeedsSession: "Start a session to open the stage screen.",
  stageTheme: "Stage theme",
  stageThemeBody: "Follow the venue theme or force one for the TV.",
  stageThemes: { venue: "Venue theme", club: "Club", lounge: "Lounge", cafe: "Cafe" },
  stageAutoOpen: "Open with the session",
  stageAutoOpenBody: "Show the stage screen as soon as a session starts.",
  updatesTitle: "Updates",
  updatesBody: "New versions download in the background and install when you quit.",
  updatesDisabled: "Updates are turned off in development builds.",
  updateStates: {
    disabled: "off",
    idle: "not checked",
    checking: "checking",
    available: "available",
    downloading: "downloading",
    ready: "ready to install",
    notAvailable: "up to date",
    error: "error",
  },
  currentVersion: "Current version",
  newVersion: "New version",
  autoCheck: "Check automatically",
  checkUpdates: "Check for updates",
  installUpdate: "Restart and install",
  stageWaiting: "Waiting for the console",
  stagePillOpen: "Requests open",
  stagePillClosed: "Requests paused",
  stageUpNext: "Up next",
  stageOrder: "Order your track",
  stageScan: "Scan the code and pick a song",
  stageHint: "No app, no sign-up. Just your phone.",
  stageDedications: "Dedications",
  stageIdleEyebrow: "The floor is yours",
  stageIdleTitle: "Order a track",
  stageIdleBody: "Scan the code and tell the DJ what to play next.",
};

const ru: Strings = {
  appName: "Joy Music",
  cancel: "Отмена",
  close: "Закрыть",
  back: "Назад",
  refresh: "Обновить",
  choose: "Выбрать",
  clear: "Сбросить",
  apply: "Применить",
  language: "Язык",
  languageBody: "Действует в пульте и на экране сцены.",
  languageNames: { uz: "Oʻzbekcha", ru: "Русский", en: "English" },
  errors: {
    generic: "Не удалось выполнить действие. Попробуйте ещё раз.",
    network: "Нет связи с сервером",
    invalid_credentials: "Неверный email или пароль",
    rate_limited: "Слишком много попыток. Повторите через несколько минут.",
    session_expired: "Сессия истекла. Войдите снова.",
    invalid_state: "Ссылка для входа недействительна или устарела. Начните заново.",
    access_denied: "Вход отменён в браузере.",
    unauthorized: "Войдите снова, чтобы продолжить",
    forbidden: "Нет доступа",
    not_found: "Не найдено. Возможно, уже удалено",
    conflict: "Заказ уже изменился. Список обновлён",
    validation_failed: "Сервер отклонил эти данные",
    no_active_session: "Нет активной сессии",
    internal: "Ошибка сервера. Повторите чуть позже",
  },
  loginTitle: "Вход в пульт диджея",
  loginSubtitle: "Заказы, очередь и экран зала в одном месте.",
  loginBrowser: "Продолжить в браузере",
  loginBrowserWaiting: "Ждём подтверждения в браузере",
  loginBrowserHint: "Подтвердите вход в только что открытом окне и вернитесь сюда.",
  loginBrowserReopen: "Открыть браузер снова",
  loginOr: "или по email",
  loginEmail: "Email",
  loginPassword: "Пароль",
  loginSubmit: "Войти",
  pickerTitle: "Выберите заведение",
  pickerSubtitle: (name) => (name ? `Вы вошли как ${name}` : "Где вы играете сегодня"),
  pickerEmpty: "Заведений пока нет",
  pickerEmptyBody: "Попросите владельца добавить вас как диджея.",
  sessionActive: "Сессия идёт",
  sessionStart: "Начать сессию",
  sessionResume: "Продолжить сессию",
  sessionConflict: "В этом заведении уже играет другой диджей.",
  signOut: "Выйти",
  settings: "Настройки",
  session: "Сессия",
  requestsOpen: "Приём заказов",
  requestsClosed: "Приём на паузе",
  openRequests: "Принимать заказы",
  commands: "Команды",
  stageOpen: "Открыть экран сцены",
  stageClose: "Закрыть экран сцены",
  boothMode: "Режим будки",
  boothModeBody: "Ультра-тёмный интерфейс, который не засвечивает будку.",
  largeTargets: "Крупные элементы",
  largeTargetsBody: "Кнопки и текст крупнее для тёмной и качающейся будки.",
  endSession: "Завершить сессию",
  endSessionTitle: "Завершить сессию?",
  endSessionBody: "Открытые заказы истекут, очередь закроется для гостей.",
  incomingTitle: "Входящие заказы",
  incomingNew: "Новые",
  incomingAll: "Все",
  incomingEmpty: "Новых заказов нет",
  incomingEmptyBody: "Заказы гостей появляются здесь сразу после отправки.",
  incomingClosed: "Приём на паузе",
  incomingClosedBody: "Включите приём, чтобы получать новые заказы.",
  queueTitle: "Очередь",
  queueEmpty: "Очередь пуста",
  queueEmptyBody: "Принятые заказы встают сюда. Перетащите, чтобы поменять порядок.",
  reorder: "Перетащить",
  reorderHint: "Перетащите заказ или используйте Alt со стрелками",
  tracks: (count) => {
    const last = count % 10;
    const tens = count % 100;
    if (last === 1 && tens !== 11) return `${count} трек`;
    if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return `${count} трека`;
    return `${count} треков`;
  },
  accept: "Принять",
  later: "Позже",
  restore: "К новым",
  decline: "Отклонить",
  declineTitle: "Отклонить заказ",
  declineReasonLabel: "Причина для гостя (необязательно)",
  declineConfirm: "Отклонить",
  reasonPlayed: "Уже играл сегодня",
  reasonMissing: "Нет такого трека",
  reasonStyle: "Не подходит к сету",
  playNow: "Играть сейчас",
  remove: "Убрать из очереди",
  pushToAir: "В эфир",
  markPlayed: "Отметить сыгранным",
  nowPlaying: "Играет сейчас",
  nothingPlaying: "Сейчас ничего не играет",
  nothingPlayingBody: "Запустите трек в DJ-программе. Он появится здесь сам.",
  progress: "Ход трека",
  sourceManual: "Отмечено вручную",
  sourceRequest: "Из заказа гостя",
  sourceDetected: (label) => `Определено: ${label}`,
  sourceNames: {
    manual: "вручную",
    request: "заказ",
    prolink: "Pro DJ Link",
    stagelinq: "StageLinQ",
    virtualdj: "VirtualDJ",
    serato: "Serato",
    traktor: "Traktor",
    rekordbox: "Rekordbox",
  },
  recentTitle: "Недавно сыграно",
  recentEmpty: "Пока ничего не сыграно",
  ago: (minutes) => (minutes < 1 ? "только что" : `${minutes} мин назад`),
  votes: "голосов",
  dedicationFor: (name) => `Для ${name}`,
  arrowUp: "Стрелка вверх",
  arrowDown: "Стрелка вниз",
  noAdapters: "Источник оборудования не включён",
  adapterStates: {
    active: "подключено",
    waiting: "ожидание",
    starting: "запуск",
    unavailable: "недоступно",
    error: "ошибка",
    stopped: "выкл",
  },
  realtimeStates: {
    connecting: "Реалтайм: подключение",
    open: "Реалтайм: онлайн",
    closed: "Реалтайм: офлайн",
  },
  latency: "Задержка",
  midi: "MIDI",
  midiDevices: (count) => (count === 0 ? "нет устройств" : `подключено: ${count}`),
  outboxPending: (count) => `ждут отправки: ${count}`,
  offlineTitle: "Нет связи",
  offlineSaved: (count) => `Ваши действия сохранены (${count}) и уйдут, когда связь вернётся.`,
  offlineStale: "Список может быть неактуален. Переподключаемся.",
  reconnecting: "Переподключение",
  syncing: "Отправляем сохранённые действия",
  retryNow: "Повторить сейчас",
  queuedToast: "Сохранено офлайн. Отправится, когда вернётся связь.",
  paletteTitle: "Палитра команд",
  palettePlaceholder: "Введите команду или трек",
  paletteEmpty: "Ничего не найдено",
  paletteNavigate: "Навигация",
  paletteSelect: "Выбрать",
  paletteClose: "Закрыть",
  paletteAccept: "Принять выбранный заказ",
  paletteDecline: "Отклонить выбранный заказ",
  paletteOpenRequests: "Принимать заказы",
  paletteCloseRequests: "Поставить приём на паузу",
  paletteGroups: {
    requests: "Заказы",
    playback: "Воспроизведение",
    view: "Вид",
    app: "Приложение",
    language: "Язык",
    session: "Сессия",
    jump: "Перейти к заказу",
  },
  settingsTabs: {
    general: "Основное",
    hardware: "Оборудование",
    midi: "MIDI",
    stage: "Сцена",
    updates: "Обновления",
  },
  appearance: "Внешний вид",
  account: "Аккаунт",
  hardwareIntro:
    "Joy Music читает, что вы играете, из вашей DJ-программы. Включите нужный источник. Гости ничего не увидят, пока трек не определится.",
  adapterInfo: {
    serato: {
      title: "Serato DJ",
      body: "Читает самый свежий файл сессии из папки истории Serato.",
    },
    virtualdj: {
      title: "VirtualDJ",
      body: "Читает папку истории или текстовый файл текущего трека, если он указан.",
    },
    traktor: {
      title: "Traktor (Icecast)",
      body: "Traktor отправляет название трека на локальный порт. Никуда дальше ничего не уходит.",
    },
    textfile: {
      title: "Текстовый файл",
      body: "Любой инструмент, который пишет текущий трек в файл: скрипты OBS, экспорт Rekordbox, свои скрипты.",
    },
    prolink: {
      title: "Pioneer Pro DJ Link",
      body: "Проигрыватели CDJ и XDJ в той же сети. Нужен необязательный модуль prolink-connect.",
    },
    stagelinq: {
      title: "Denon StageLinQ",
      body: "Оборудование Denon и Engine DJ в той же сети. Нужен необязательный модуль stagelinq.",
    },
    simulator: {
      title: "Симулятор",
      body: "Проигрывает сценарий из нескольких треков, чтобы опробовать пульт без оборудования.",
    },
  },
  detectedNow: "Определено сейчас",
  seratoFolder: "Папка Serato",
  seratoFolderHint: "Папка _Serato_. Оставьте пустой, чтобы взять путь по умолчанию.",
  virtualDjFolder: "Папка истории",
  virtualDjFolderHint: "Пусто: стандартная папка истории VirtualDJ.",
  virtualDjFile: "Файл текущего трека (необязательно)",
  virtualDjFileHint: "Текстовый файл, который VirtualDJ обновляет при смене трека.",
  traktorPort: "Порт",
  traktorPassword: "Пароль (необязательно)",
  traktorSteps: (port) => [
    "В Traktor откройте Preferences, затем Broadcasting.",
    `Укажите адрес сервера 127.0.0.1 и порт ${port}.`,
    "Пароль здесь и в Traktor должен совпадать. Можно оставить оба пустыми.",
    "Выберите формат MP3 и нажмите Start Broadcasting.",
  ],
  textFilePath: "Путь к файлу",
  textFileTemplate: "Шаблон",
  textFileTemplateHint: "Используйте {artist} и {title}. Например: {artist} - {title}",
  simulatorNext: "Следующий трек симулятора",
  midiTitle: "MIDI-контроллер",
  midiBody: "Управляйте пультом с пэдов и энкодеров контроллера.",
  midiLeds: "Подсветка пэдов",
  midiLedsBody: "Пэды горят для новых заказов, очереди и воспроизведения.",
  midiUnsupported: "MIDI недоступен в этой системе",
  midiDenied: "Доступ к MIDI заблокирован",
  midiDevicesTitle: "Устройства",
  midiNoDevices: "MIDI-контроллер не найден. Подключите его, и он появится здесь.",
  connected: "подключён",
  disconnected: "отключён",
  midiPresets: "Пресеты",
  midiPresetsBody: "Отправная точка для популярных контроллеров. Донастройте через обучение.",
  unverified: "Не проверено",
  detected: "Найден",
  midiUnverifiedNote:
    "Пресеты пока не проверены на реальных устройствах. Если пэд не реагирует, используйте обучение ниже.",
  midiMapping: "Назначения",
  midiMappingBody: "Нажмите «Обучить» и коснитесь нужного пэда или ручки.",
  midiActions: {
    acceptTop: "Принять заказ",
    declineTop: "Отклонить заказ",
    playNext: "Играть следующий",
    pushToAir: "В эфир",
    markPlayed: "Отметить сыгранным",
    toggleRequestsOpen: "Пауза или возобновление приёма",
    "moveSelection:1": "Выделение вниз",
    "moveSelection:-1": "Выделение вверх",
  },
  unassigned: "не задано",
  learn: "Обучить",
  midiPress: "Нажмите элемент...",
  stageWindow: "Окно сцены",
  stageWindowBody:
    "Полноэкранный экран для ТВ заведения. Без элементов управления, следует за пультом.",
  stageDisplay: "Дисплей",
  stageDisplayAuto: "Автоматически: первый внешний дисплей",
  primaryDisplay: "основной",
  stageNeedsSession: "Начните сессию, чтобы открыть экран сцены.",
  stageTheme: "Тема сцены",
  stageThemeBody: "Следовать теме заведения или задать свою для ТВ.",
  stageThemes: { venue: "Тема заведения", club: "Club", lounge: "Lounge", cafe: "Cafe" },
  stageAutoOpen: "Открывать вместе с сессией",
  stageAutoOpenBody: "Показывать экран сцены сразу после старта сессии.",
  updatesTitle: "Обновления",
  updatesBody: "Новые версии скачиваются в фоне и ставятся при выходе.",
  updatesDisabled: "В сборках для разработки обновления выключены.",
  updateStates: {
    disabled: "выкл",
    idle: "не проверялось",
    checking: "проверка",
    available: "доступно",
    downloading: "загрузка",
    ready: "готово к установке",
    notAvailable: "актуальная версия",
    error: "ошибка",
  },
  currentVersion: "Текущая версия",
  newVersion: "Новая версия",
  autoCheck: "Проверять автоматически",
  checkUpdates: "Проверить обновления",
  installUpdate: "Перезапустить и установить",
  stageWaiting: "Ждём пульт",
  stagePillOpen: "Приём заказов открыт",
  stagePillClosed: "Приём на паузе",
  stageUpNext: "Дальше",
  stageOrder: "Закажи трек",
  stageScan: "Сканируй код и выбери песню",
  stageHint: "Без приложений и регистрации. Только телефон.",
  stageDedications: "Посвящения",
  stageIdleEyebrow: "Танцпол ваш",
  stageIdleTitle: "Закажи трек",
  stageIdleBody: "Отсканируй код и скажи диджею, что играть дальше.",
};

const uz: Strings = {
  appName: "Joy Music",
  cancel: "Bekor qilish",
  close: "Yopish",
  back: "Orqaga",
  refresh: "Yangilash",
  choose: "Tanlash",
  clear: "Tozalash",
  apply: "Qoʻllash",
  language: "Til",
  languageBody: "Pult va sahna ekraniga taalluqli.",
  languageNames: { uz: "Oʻzbekcha", ru: "Русский", en: "English" },
  errors: {
    generic: "Amalni bajarib boʻlmadi. Qayta urinib koʻring.",
    network: "Serverga ulanib boʻlmadi",
    invalid_credentials: "Email yoki parol notoʻgʻri",
    rate_limited: "Juda koʻp urinish. Bir necha daqiqadan keyin qayta urinib koʻring.",
    session_expired: "Sessiya tugadi. Qayta kiring.",
    invalid_state: "Kirish havolasi yaroqsiz yoki eskirgan. Qaytadan boshlang.",
    access_denied: "Brauzerda kirish bekor qilindi.",
    unauthorized: "Davom etish uchun qayta kiring",
    forbidden: "Ruxsat yoʻq",
    not_found: "Topilmadi. Allaqachon olib tashlangan boʻlishi mumkin",
    conflict: "Buyurtma allaqachon oʻzgargan. Roʻyxat yangilandi",
    validation_failed: "Server bu maʼlumotni qabul qilmadi",
    no_active_session: "Faol sessiya yoʻq",
    internal: "Server xatosi. Birozdan keyin urinib koʻring",
  },
  loginTitle: "DJ paneliga kirish",
  loginSubtitle: "Buyurtmalar, navbat va zal ekrani bir joyda.",
  loginBrowser: "Brauzer orqali davom etish",
  loginBrowserWaiting: "Brauzerda tasdiqlash kutilmoqda",
  loginBrowserHint: "Hozir ochilgan oynada kirishni tasdiqlang, keyin shu yerga qayting.",
  loginBrowserReopen: "Brauzerni qayta ochish",
  loginOr: "yoki email orqali",
  loginEmail: "Email",
  loginPassword: "Parol",
  loginSubmit: "Kirish",
  pickerTitle: "Muassasani tanlang",
  pickerSubtitle: (name) => (name ? `Siz ${name} sifatida kirdingiz` : "Bugun qayerda ijro etasiz"),
  pickerEmpty: "Hozircha muassasa yoʻq",
  pickerEmptyBody: "Egasidan sizni DJ sifatida qoʻshishni soʻrang.",
  sessionActive: "Sessiya ketmoqda",
  sessionStart: "Sessiyani boshlash",
  sessionResume: "Sessiyani davom ettirish",
  sessionConflict: "Bu muassasada boshqa DJ allaqachon sessiya olib bormoqda.",
  signOut: "Chiqish",
  settings: "Sozlamalar",
  session: "Sessiya",
  requestsOpen: "Buyurtmalar ochiq",
  requestsClosed: "Buyurtmalar toʻxtatilgan",
  openRequests: "Buyurtmalarni qabul qilish",
  commands: "Buyruqlar",
  stageOpen: "Sahna ekranini ochish",
  stageClose: "Sahna ekranini yopish",
  boothMode: "Kabina rejimi",
  boothModeBody: "Kabinani yoritmaydigan juda qorongʻi interfeys.",
  largeTargets: "Yirik elementlar",
  largeTargetsBody: "Qorongʻi va tebranuvchi kabina uchun yirik tugma va matn.",
  endSession: "Sessiyani tugatish",
  endSessionTitle: "Sessiya tugatilsinmi?",
  endSessionBody: "Ochiq buyurtmalar eskiradi, navbat mehmonlar uchun yopiladi.",
  incomingTitle: "Kiruvchi buyurtmalar",
  incomingNew: "Yangi",
  incomingAll: "Hammasi",
  incomingEmpty: "Yangi buyurtma yoʻq",
  incomingEmptyBody: "Mehmonlar buyurtmalari yuborilishi bilan shu yerda paydo boʻladi.",
  incomingClosed: "Buyurtmalar toʻxtatilgan",
  incomingClosedBody: "Yangi buyurtma olish uchun qabulni yoqing.",
  queueTitle: "Navbat",
  queueEmpty: "Navbat boʻsh",
  queueEmptyBody: "Qabul qilingan buyurtmalar shu yerga tizilad. Tartibni sudrab oʻzgartiring.",
  reorder: "Tartibni oʻzgartirish",
  reorderHint: "Sudrab oʻzgartiring yoki Alt bilan strelkalardan foydalaning",
  tracks: (count) => `${count} ta trek`,
  accept: "Qabul qilish",
  later: "Keyinroq",
  restore: "Yangilarga",
  decline: "Rad etish",
  declineTitle: "Buyurtmani rad etish",
  declineReasonLabel: "Mehmon uchun sabab (ixtiyoriy)",
  declineConfirm: "Rad etish",
  reasonPlayed: "Bugun allaqachon chalingan",
  reasonMissing: "Bu trek menda yoʻq",
  reasonStyle: "Setga mos kelmaydi",
  playNow: "Hozir qoʻyish",
  remove: "Navbatdan olib tashlash",
  pushToAir: "Efirga",
  markPlayed: "Chalindi deb belgilash",
  nowPlaying: "Hozir chalinmoqda",
  nothingPlaying: "Hozir hech narsa chalinmayapti",
  nothingPlayingBody: "DJ dasturida trekni ishga tushiring. U shu yerda oʻzi paydo boʻladi.",
  progress: "Trek borishi",
  sourceManual: "Qoʻlda belgilangan",
  sourceRequest: "Mehmon buyurtmasidan",
  sourceDetected: (label) => `Aniqlandi: ${label}`,
  sourceNames: {
    manual: "qoʻlda",
    request: "buyurtma",
    prolink: "Pro DJ Link",
    stagelinq: "StageLinQ",
    virtualdj: "VirtualDJ",
    serato: "Serato",
    traktor: "Traktor",
    rekordbox: "Rekordbox",
  },
  recentTitle: "Yaqinda chalingan",
  recentEmpty: "Hali hech narsa chalinmagan",
  ago: (minutes) => (minutes < 1 ? "hozirgina" : `${minutes} daq oldin`),
  votes: "ovoz",
  dedicationFor: (name) => `${name} uchun`,
  arrowUp: "Yuqoriga strelka",
  arrowDown: "Pastga strelka",
  noAdapters: "Uskuna manbai yoqilmagan",
  adapterStates: {
    active: "ulangan",
    waiting: "kutilmoqda",
    starting: "ishga tushmoqda",
    unavailable: "mavjud emas",
    error: "xato",
    stopped: "oʻchiq",
  },
  realtimeStates: {
    connecting: "Real vaqt: ulanmoqda",
    open: "Real vaqt: onlayn",
    closed: "Real vaqt: oflayn",
  },
  latency: "Kechikish",
  midi: "MIDI",
  midiDevices: (count) => (count === 0 ? "qurilma yoʻq" : `ulangan: ${count}`),
  outboxPending: (count) => `yuborilishi kutilmoqda: ${count}`,
  offlineTitle: "Aloqa yoʻq",
  offlineSaved: (count) => `Amallaringiz saqlandi (${count}) va aloqa qaytgach yuboriladi.`,
  offlineStale: "Roʻyxat eskirgan boʻlishi mumkin. Qayta ulanmoqda.",
  reconnecting: "Qayta ulanmoqda",
  syncing: "Saqlangan amallar yuborilmoqda",
  retryNow: "Hozir qayta urinish",
  queuedToast: "Oflayn saqlandi. Aloqa qaytgach yuboriladi.",
  paletteTitle: "Buyruqlar palitrasi",
  palettePlaceholder: "Buyruq yoki trek nomini yozing",
  paletteEmpty: "Hech narsa topilmadi",
  paletteNavigate: "Yurish",
  paletteSelect: "Tanlash",
  paletteClose: "Yopish",
  paletteAccept: "Tanlangan buyurtmani qabul qilish",
  paletteDecline: "Tanlangan buyurtmani rad etish",
  paletteOpenRequests: "Buyurtmalarni qabul qilish",
  paletteCloseRequests: "Qabulni toʻxtatib turish",
  paletteGroups: {
    requests: "Buyurtmalar",
    playback: "Ijro",
    view: "Koʻrinish",
    app: "Ilova",
    language: "Til",
    session: "Sessiya",
    jump: "Buyurtmaga oʻtish",
  },
  settingsTabs: {
    general: "Asosiy",
    hardware: "Uskuna",
    midi: "MIDI",
    stage: "Sahna",
    updates: "Yangilanishlar",
  },
  appearance: "Koʻrinish",
  account: "Hisob",
  hardwareIntro:
    "Joy Music siz chalayotgan trekni DJ dasturidan oʻqiydi. Kerakli manbani yoqing. Trek aniqlanmaguncha mehmonlarga hech narsa koʻrinmaydi.",
  adapterInfo: {
    serato: {
      title: "Serato DJ",
      body: "Serato tarix jildidagi eng yangi sessiya faylini oʻqiydi.",
    },
    virtualdj: {
      title: "VirtualDJ",
      body: "Tarix jildini yoki koʻrsatilgan joriy trek matn faylini oʻqiydi.",
    },
    traktor: {
      title: "Traktor (Icecast)",
      body: "Traktor trek nomini mahalliy portga yuboradi. Boshqa joyga hech narsa yuborilmaydi.",
    },
    textfile: {
      title: "Matn fayli",
      body: "Joriy trekni faylga yozadigan har qanday vosita: OBS skriptlari, Rekordbox eksporti, oʻz skriptlaringiz.",
    },
    prolink: {
      title: "Pioneer Pro DJ Link",
      body: "Xuddi shu tarmoqdagi CDJ va XDJ pleyerlar. Ixtiyoriy prolink-connect moduli kerak.",
    },
    stagelinq: {
      title: "Denon StageLinQ",
      body: "Xuddi shu tarmoqdagi Denon va Engine DJ uskunalari. Ixtiyoriy stagelinq moduli kerak.",
    },
    simulator: {
      title: "Simulyator",
      body: "Pultni uskunasiz sinash uchun bir necha trekdan iborat ssenariyni chaladi.",
    },
  },
  detectedNow: "Hozir aniqlandi",
  seratoFolder: "Serato jildi",
  seratoFolderHint: "_Serato_ jildi. Standart joylashuv uchun boʻsh qoldiring.",
  virtualDjFolder: "Tarix jildi",
  virtualDjFolderHint: "Boʻsh: VirtualDJ standart tarix jildi.",
  virtualDjFile: "Joriy trek fayli (ixtiyoriy)",
  virtualDjFileHint: "VirtualDJ trek almashganda yangilaydigan matn fayli.",
  traktorPort: "Port",
  traktorPassword: "Parol (ixtiyoriy)",
  traktorSteps: (port) => [
    "Traktorda Preferences, keyin Broadcasting boʻlimini oching.",
    `Server manzili 127.0.0.1, port ${port} qilib belgilang.`,
    "Parol bu yerda va Traktorda bir xil boʻlsin yoki ikkalasini boʻsh qoldiring.",
    "MP3 formatini tanlab, Start Broadcasting tugmasini bosing.",
  ],
  textFilePath: "Fayl yoʻli",
  textFileTemplate: "Shablon",
  textFileTemplateHint: "{artist} va {title} dan foydalaning. Masalan: {artist} - {title}",
  simulatorNext: "Simulyatorning keyingi treki",
  midiTitle: "MIDI kontroller",
  midiBody: "Pultni kontrollerdagi pad va enkoderlar bilan boshqaring.",
  midiLeds: "Padlar yoritilishi",
  midiLedsBody: "Padlar yangi buyurtma, navbat va ijro holatiga qarab yonadi.",
  midiUnsupported: "Bu tizimda MIDI mavjud emas",
  midiDenied: "MIDI ruxsati bloklangan",
  midiDevicesTitle: "Qurilmalar",
  midiNoDevices: "MIDI kontroller topilmadi. Ulasangiz, shu yerda paydo boʻladi.",
  connected: "ulangan",
  disconnected: "uzilgan",
  midiPresets: "Andozalar",
  midiPresetsBody:
    "Mashhur kontrollerlar uchun boshlangʻich nuqta. Oʻrgatish rejimida aniqlashtiring.",
  unverified: "Tekshirilmagan",
  detected: "Topildi",
  midiUnverifiedNote:
    "Andozalar haqiqiy qurilmalarda hali sinalmagan. Pad ishlamasa, quyidagi oʻrgatish rejimidan foydalaning.",
  midiMapping: "Boshqaruvlar",
  midiMappingBody: "“Oʻrgatish” tugmasini bosing va kerakli pad yoki dastaga tegining.",
  midiActions: {
    acceptTop: "Buyurtmani qabul qilish",
    declineTop: "Buyurtmani rad etish",
    playNext: "Keyingisini qoʻyish",
    pushToAir: "Efirga",
    markPlayed: "Chalindi deb belgilash",
    toggleRequestsOpen: "Qabulni toʻxtatish yoki davom ettirish",
    "moveSelection:1": "Tanlov pastga",
    "moveSelection:-1": "Tanlov yuqoriga",
  },
  unassigned: "belgilanmagan",
  learn: "Oʻrgatish",
  midiPress: "Elementni bosing...",
  stageWindow: "Sahna oynasi",
  stageWindowBody: "Muassasa televizori uchun butun ekran oynasi. Boshqaruvsiz, pultga ergashadi.",
  stageDisplay: "Displey",
  stageDisplayAuto: "Avtomatik: birinchi tashqi displey",
  primaryDisplay: "asosiy",
  stageNeedsSession: "Sahna ekranini ochish uchun sessiyani boshlang.",
  stageTheme: "Sahna mavzusi",
  stageThemeBody: "Muassasa mavzusiga ergashish yoki televizor uchun oʻzini tanlash.",
  stageThemes: { venue: "Muassasa mavzusi", club: "Club", lounge: "Lounge", cafe: "Cafe" },
  stageAutoOpen: "Sessiya bilan ochish",
  stageAutoOpenBody: "Sessiya boshlanishi bilan sahna ekranini koʻrsatish.",
  updatesTitle: "Yangilanishlar",
  updatesBody: "Yangi versiyalar fonda yuklanadi va chiqishda oʻrnatiladi.",
  updatesDisabled: "Ishlab chiqish yigʻmalarida yangilanishlar oʻchirilgan.",
  updateStates: {
    disabled: "oʻchiq",
    idle: "tekshirilmagan",
    checking: "tekshirilmoqda",
    available: "mavjud",
    downloading: "yuklanmoqda",
    ready: "oʻrnatishga tayyor",
    notAvailable: "eng yangi versiya",
    error: "xato",
  },
  currentVersion: "Joriy versiya",
  newVersion: "Yangi versiya",
  autoCheck: "Avtomatik tekshirish",
  checkUpdates: "Yangilanishlarni tekshirish",
  installUpdate: "Qayta ishga tushirib oʻrnatish",
  stageWaiting: "Pult kutilmoqda",
  stagePillOpen: "Buyurtmalar ochiq",
  stagePillClosed: "Buyurtmalar toʻxtatilgan",
  stageUpNext: "Keyingi",
  stageOrder: "Trek buyurtma qiling",
  stageScan: "Kodni skanerlang va qoʻshiq tanlang",
  stageHint: "Ilova ham, roʻyxatdan oʻtish ham shart emas. Faqat telefon.",
  stageDedications: "Bagʻishlovlar",
  stageIdleEyebrow: "Raqs maydoni sizniki",
  stageIdleTitle: "Trek buyurtma qiling",
  stageIdleBody: "Kodni skanerlang va DJ ga keyin nima chalishni ayting.",
};

export const strings: Record<Locale, Strings> = { uz, ru, en };
