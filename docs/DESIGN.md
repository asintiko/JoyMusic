# Дизайн-система Joy Music

Пакет `@joymusic/ui` (`packages/ui`). Концепция «After-dark precision»: тёмная сцена, точные данные, один яркий сигнал. Три темы заведений (Club, Lounge, Café) работают на одном наборе токенов и компонентов. Живой спецификацией служит playground: `pnpm --filter @joymusic/ui playground` (порт 5199).

## Подключение

```ts
import "@joymusic/ui/styles.css";
import { Button, NowPlayingHero, Toaster, applyTheme } from "@joymusic/ui";

applyTheme("lounge");
```

- `styles.css` включает Tailwind 4, шрифты, токены, тему, базу и `components.css`. В приложении Tailwind должен быть подключён (peer-зависимость).
- Тема задаётся атрибутом `data-theme="club" | "lounge" | "cafe"` на `<html>` или любом контейнере. Без атрибута действует Club. Помощник `applyTheme(theme, target?)` ещё обновляет `meta[name=theme-color]`.
- Корень приложения оборачиваем в `<Toaster>` (тосты) и, при необходимости, `<TooltipProvider>`.
- В коде нет комментариев, поэтому вся документация здесь и в README.

## Токены

Все значения лежат в `src/tokens.css` как CSS-переменные `--jm-*`, а `src/theme.css` пробрасывает их в Tailwind (`bg-surface-2`, `text-fg-muted`, `rounded-cover`, `shadow-3`, `bg-brand-gradient`).

| Группа         | Токены                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности    | `canvas`, `surface-1..5` (слои от фона к самым поднятым элементам)                                                                                                           |
| Текст          | `fg`, `fg-muted`, `fg-subtle`, `fg-disabled`, `fg-inverse`                                                                                                                   |
| Линии и стекло | `line`, `line-strong`, `scrim`, `glass`, `glass-line`, `highlight`                                                                                                           |
| Бренд          | `brand`, `brand-from/to`, `brand-strong-from/to` (под текст `on-brand`), `brand-soft`, `brand-glow`, `focus`                                                                 |
| Сигналы        | `playing` (лайм), `next` (янтарь), `danger`, `success`, `info`; у каждого `-fg` (цвет текста), `-soft` (заливка бейджа), `on-*` (текст на сплошной заливке)                  |
| Радиусы        | `xs..2xl`, `cover`, `pill`. В Club скругления крупнее, в Lounge строже, в Café самые мягкие                                                                                  |
| Тени           | `shadow-1..4`, `glow-brand`, `glow-playing`, `glow-soft`                                                                                                                     |
| Движение       | `dur-*` (80 до 1400 мс), `ease-standard/out/in/in-out/spring`                                                                                                                |
| Типографика    | `font-display` Unbounded, `font-sans` Manrope, `font-mono` JetBrains Mono; утилиты `type-display-*`, `type-title-*`, `type-body*`, `type-label`, `type-eyebrow`, `type-mono` |

Контраст проверяют тесты `tests/tokens-contrast.test.ts` для каждой темы: основной текст на всех поверхностях не ниже 7:1, приглушённый и второстепенный не ниже 4.5:1, сигнальные цвета и текст на заливках не ниже 4.5:1, фокус не ниже 3:1.

## Темы

| Тема   | Характер                                                                 | Бренд     | Схема |
| ------ | ------------------------------------------------------------------------ | --------- | ----- |
| Club   | Неон: чёрно-фиолетовый холст `#0A0812`, градиент ультрафиолет → маджента | `#A996FF` | dark  |
| Lounge | Чёрный с золотом, строгие радиусы                                        | `#E4C078` | dark  |
| Café   | Мягкая светлая: кремовый холст, терракотовый акцент                      | `#A64614` | light |

Заведение выбирает тему в админке. Обложки треков и логотип остаются неизменными во всех темах: обложка это «искусство», а не хром интерфейса. Градиент знака следует теме через `tone="theme"`.

## Компоненты

Все компоненты доступны из `@joymusic/ui`. Фокус виден везде (`focus-ring`), `prefers-reduced-motion` отключает анимации (CSS и `usePrefersReducedMotion` для `motion`).

### Основа

- `Button` (`variant`: primary, secondary, ghost, danger; `size`: sm, md, lg, xl; `loading`, `leftIcon`, `rightIcon`, `fullWidth`), `IconButton` (обязательный `label`, `variant`, `pressed`, `loading`).
- `Input`, `Textarea`, `Select`, `SearchInput` (`onValueChange`, `shortcut`, `loading`), `Switch`, `Checkbox`: подпись, подсказка, ошибка с `aria-describedby`.
- `Badge` (`tone`, `dot`), `StatusPill` (шесть статусов заказа с иконкой и локализуемым `label`), `Chip` и `ChipRow` (переключатель, `tone` default/brand/outline, `count`), `Kbd`, `Shortcut`, `Avatar`, `Spinner`, `Skeleton`, `Card` (flat, raised, glass, outline, brand).

### Оверлеи

- `Sheet` (`open`, `onOpenChange`, `title`, `description`, `side` bottom или right, `footer`): Radix Dialog плюс перетаскивание за ручку и шапку. Закрывается при сдвиге больше 120 px или скорости больше 520 px/с (`shouldDismissSheet`).
- `Dialog` (`size` sm, md, lg), `Tooltip` (`shortcut`), `CommandPalette` (`items: CommandItem[]`, комбобокс со стрелками, Enter, Esc; хук `useCommandPalette` вешает Cmd/Ctrl+K).
- `Toaster` / `useToast()` (`toast`, `success`, `error`, `dismiss`): тосты сверху или снизу, пауза при наведении, свайп для закрытия, ошибки как `role="alert"`, не больше четырёх одновременно.

### Навигация и данные

- `Tabs`, `TabsList`, `TabsTrigger` (`count`), `TabsContent`: варианты underline и segmented, индикатор переезжает пружиной.
- `Table` и части (`TableHeaderCell` с `sortable`, `direction`, `numeric`; `TableCell` с `mono`, `muted`): плотная админская таблица с `aria-sort`.
- `Metric` (значение, дельта, спарклайн), `Sparkline`, `EmptyState` (семь иллюстраций: search, queue, inbox, closed, offline, qr, error), `ProgressBar` (`progress` 0..1 от сервера, `smooth` даёт линейный переход 1 с между обновлениями, `showTimes`).

### Музыкальные

- `Cover`: картинка с blur-up, при отсутствии или ошибке загрузки рисует генеративную обложку. `GenerativeCover` и `coverSpec(seed)` детерминированы: 12 кураторских палитр и 8 узоров (orbs, rings, bars, sunrise, waves, halftone, arcs, ikat). Ikat отсылает к узбекскому орнаменту.
- `AmbientBackground` и `useArtworkPalette(url)`: цвета из обложки через canvas (три доминирующих оттенка), при ошибке CORS или отсутствии картинки цвета берутся из генеративной палитры или из токенов темы. Смена цветов плавная (1.4 с).
- `NowPlayingHero` (`size` phone, desk, tv; `layout` stack, split): обложка с наклоном и бликом за указателем, бегущая строка названия (`Marquee`), эквалайзер, пульс в такт BPM, плашка посвящения, прогресс. `useTrackProgress({ startedAt, durationSec, serverOffsetMs })` считает прогресс по серверному времени.
- `Equalizer` (`paused`, `bpm`, `bars`), `Marquee`, `Ticker`, `TrackRow` (размеры sm, md, lg, состояния idle, playing, added, disabled), `QueueItem` (варианты `guest`, `dj`, `tv`, `incoming`).
- `Logo` (`variant` mark, wordmark, horizontal, stacked; `tone` brand, theme, current, white, black; `logoMinHeights`).

## Схемы экранов

Каждая схема воспроизведена в playground (`?view=guest-now|guest-search|tv|dj|admin`) и служит визуальной спецификацией.

**Гость, «сейчас играет» (390×844).** Размытый холст из цветов обложки, шапка с логотипом и заведением, переключатель языка. Герой: обложка 272 px с наклоном, эквалайзер, BPM и тональность, название шрифтом Unbounded, посвящение, прогресс. Ниже «Дальше в очереди» (свой заказ подсвечен полосой бренда), внизу липкая строка поиска и кнопка «заказ текстом». Список намеренно выглядывает из-под строки поиска.

**Гость, поиск.** Поле поиска, чипы подсказок (`suggestionTitles` из `@joymusic/shared`), плашка транслитерации «Shahzoda ↔ Шахзода», строки `TrackRow` размера lg с кнопкой «+» или отметкой «добавлено», карточка «не нашли? закажите текстом», нижняя навигация.

**ТВ (1920×1080).** Размытая фотография заведения под темой, шапка с часами и статусом приёма, слева герой в режиме split (обложка 556 px, название 64 px), под ним два `QueueItem` для ТВ, справа QR в белой карточке (для сканирования QR всегда тёмный на светлом) и посвящения, внизу бегущая лента следующих треков с затуханием по краям.

**Пульт диджея (1440×900).** Верхняя панель: логотип, сессия и таймер, переключатель приёма заказов, кнопка палитры команд (Cmd/Ctrl+K), аватар. Три панели: входящие (`incoming`: принять, позже, отклонить), очередь (`dj`: ручка, позиция, обложка, стол, посвящение, голоса, действия, зона сброса), играющий трек (`NowPlayingHero size="desk"`) и недавно сыгранные. Внизу строка статусов оборудования: Pro DJ Link, Rekordbox, задержка, realtime, каталог. Горячие клавиши A, D, L показаны в подвале панели.

**Админ-панель (1440×900).** Боковое меню 240 px (переключатель организации, группы разделов, пользователь), заголовок с поиском Cmd+K, диапазоном и главным действием, четыре `Metric`, столбчатая диаграмма по часам (пик выделен градиентом) и топ треков, плотная таблица заведений со спарклайнами и статусами.

## Бренд

- Знак и словесный знак берутся из `@joymusic/brand` (`logoMarkPaths`, `logoWordmark`), файлы лежат в `packages/brand/assets/logo`. Компонент `Logo` рисует их inline и не требует запросов.
- Охранное поле: не меньше ширины ножки знака (около четверти высоты знака) со всех сторон.
- Минимальные высоты: знак 16 px, словесный знак 14 px, горизонтальный логотип 24 px, вертикальный 56 px.
- Можно: градиентный знак на тёмном и светлом холсте, белый или чёрный монохром на фотографиях и градиентах, `tone="theme"` внутри тем заведений.
- Нельзя: растягивать и вращать, менять цвета градиента, ставить фирменный градиент на пёстрый фон без затемнения, добавлять тени и обводки, набирать слово другим шрифтом.
- Точка над «i» всегда маджента (`#FF4FD8`, на светлом фоне `#D92FB4`).

### Микротексты

| Ситуация       | uz (латиница)                    | ru                           | en                        |
| -------------- | -------------------------------- | ---------------------------- | ------------------------- |
| Сейчас играет  | Hozir chalinmoqda                | Играет сейчас                | Now playing               |
| Поиск          | Qoʻshiq yoki ijrochi qidiring    | Найдите трек или исполнителя | Search a song or artist   |
| Заказ принят   | Buyurtma qabul qilindi           | Заказ принят                 | Request received          |
| Посвящение     | Aziz uchun, tugʻilgan kun bilan! | Для Азиза, с днём рождения!  | For Aziz, happy birthday! |
| Пустая очередь | Navbat boʻsh                     | Очередь пуста                | The queue is empty        |
| Нет связи      | Aloqa yoʻq                       | Нет связи                    | No connection             |

Правила: короткие глаголы, без восклицаний в ошибках, тон тёплый и деловой. В узбекском используем апострофы `ʻ` (U+02BB) в `oʻ`, `gʻ`, а не прямой `'`. Полный набор строк для playground лежит в `playground/src/strings.ts`, статусы и заголовки подсказок берутся из `@joymusic/shared`.

## Движение

- Функциональное движение быстрое (140 до 220 мс), сценическое медленное (эквалайзер, дрейф размытых пятен 34 до 51 с, смена палитры 1.4 с).
- Пружины из `lib/motion.ts`: `snappy` для диалогов и тостов, `sheet` для листов, `soft` для индикаторов.
- Пульс обложки привязан к BPM (`60000 / bpm` мс), эквалайзер меняет длительность столбцов от BPM.
- `prefers-reduced-motion`: анимации CSS сводятся к 0.01 мс, дрейф, бегущая строка и ленты отключаются, `motion`-компоненты переходят в мгновенные переходы, наклон обложки выключается.
- Ничто не двигается ради украшения: анимация показывает состояние (играет, пауза, ожидание) или связь между экранами.

## Шрифты и узбекские глифы

Все шрифты встроены (`@fontsource-variable/*`, без CDN): Unbounded для заголовков, Manrope для интерфейса, JetBrains Mono для BPM, времени и чисел. Отчёт покрытия: `pnpm --filter @joymusic/ui fonts:coverage`, результат в `scripts/font-coverage.report.json`.

Выводы:

- Латиница узбекского алфавита и русская кириллица покрыты всеми тремя шрифтами полностью.
- Узбекские буквы кириллицы `ў қ ғ ҳ` отсутствуют в Unbounded и частично в Manrope и JetBrains Mono. Их закрывает подмножество `Joy Cyrillic Patch` (woff2 около 1.5 КБ).
- Модификаторы `ʻ` и `ʼ` (U+02BB, U+02BC) частично отсутствуют, добавлены патчи `Joy Manrope Patch` и `Joy Mono Patch`.
- Стрелки `← → ✓` и символы клавиш `⌘ ⇧ ⌥ ⌃ ↵` не входят ни в один шрифт. Поэтому в интерфейсе они везде заменены иконками lucide (`Command`, `ArrowBigUp`, `Option`, `CornerDownLeft`), а знак `↔` в плашке транслитерации берётся из системного фолбэка. Новые символы нужно проверять этим скриптом до появления в копирайте.
- Порядок семейств: сначала основной шрифт, затем патчи, затем системный стек, поэтому недостающий глиф не «ломает» строку.

## Тесты

`pnpm --filter @joymusic/ui test`: контраст токенов по темам (WCAG AA), детерминизм генеративных обложек и извлечение палитры, базовое поведение StatusPill, Button, Sheet, Toast, Tabs, CommandPalette, smoke-проверки axe для основных компонентов. Проверка комментариев: `pnpm check:comments`.

## Скриншоты

Снимаются командой `pnpm --filter @joymusic/ui screenshots` (сборка playground, Playwright, chromium из `PLAYWRIGHT_BROWSERS_PATH`). Языки по темам чередуются, чтобы каждый экран показан на uz, ru и en.

| Экран               | Club                                                                                                                                                                                  | Lounge                                                                       | Café                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Гость, играет       | [uz](design/screens/guest-now-club-uz.png), [ru](design/screens/guest-now-club-ru.png), [en](design/screens/guest-now-club-en.png), [с фото](design/screens/guest-now-club-photo.png) | [ru](design/screens/guest-now-lounge-ru.png)                                 | [en](design/screens/guest-now-cafe-en.png)          |
| Гость, поиск        | [ru](design/screens/guest-search-club-ru.png)                                                                                                                                         | [en](design/screens/guest-search-lounge-en.png)                              | [uz](design/screens/guest-search-cafe-uz.png)       |
| ТВ                  | [uz](design/screens/tv-club-uz.png)                                                                                                                                                   | [ru](design/screens/tv-lounge-ru.png), [uz](design/screens/tv-lounge-uz.png) | [en](design/screens/tv-cafe-en.png)                 |
| Пульт диджея        | [en](design/screens/dj-club-en.png), [ru](design/screens/dj-club-ru.png)                                                                                                              | [uz](design/screens/dj-lounge-uz.png)                                        | [ru](design/screens/dj-cafe-ru.png)                 |
| Админка             | [ru](design/screens/admin-club-ru.png)                                                                                                                                                | [en](design/screens/admin-lounge-en.png)                                     | [uz](design/screens/admin-cafe-uz.png)              |
| Галерея компонентов | [club](design/screens/gallery-club-en.png)                                                                                                                                            | [lounge](design/screens/gallery-lounge-en.png)                               | [cafe](design/screens/gallery-cafe-en.png)          |
| Оверлеи             | [sheet](design/screens/overlay-sheet-club-uz.png), [toast](design/screens/overlay-toast-club-uz.png), [палитра](design/screens/overlay-palette-club-ru.png)                           | [боковой лист](design/screens/overlay-side-sheet-lounge-ru.png)              | [диалог](design/screens/overlay-dialog-cafe-en.png) |

## Известные ограничения

- Перетаскивание элементов очереди в пульте пока показано только ручкой и зоной сброса; логику DnD добавит приложение диджея.
- Тосты и оверлеи по умолчанию выводятся в `document.body` и подхватывают тему корня документа. Для вложенного контейнера с `data-theme` передайте `container` в `Toaster`, `Dialog` или `Sheet`.
- `useArtworkPalette` требует CORS-заголовков у источника обложек. Без них цвета берутся из генеративной палитры.
- QR в playground это заглушка (`packages/qr` отвечает за настоящий код).

## Журнал изменений

- 2026-09-30: `EmptyState` получил один ограничивающий `max-w` вместо конфликта `w-full` и `w-56`; `Toaster`, `Dialog` и `Sheet` рисуют портал только после монтирования (без расхождения SSR и гидратации) и принимают `container`; `AmbientBackground` размывает `imageBackdrop` классом `jm-ambient-image` и токеном `--jm-blur-backdrop`; `GenerativeCover` стал чистой функцией сида (StrictMode); `type-eyebrow` отключает кернинг, из-за которого в паре TT появлялся разрыв («SET TINGS»).
