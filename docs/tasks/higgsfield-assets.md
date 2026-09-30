# Задание: изображения для Joy Music через Higgsfield

Выполняется локально, на компьютере владельца проекта, где есть доступ к GitHub и вход в аккаунт Higgsfield.

## Жёсткие правила

- Только изображения. Видео не генерировать никогда.
- Лимит на весь проект: 60 кредитов. Останавливаться на лимите, не выходить за него.
- Навык `higgsfield-generate` по умолчанию советует не считать стоимость. Для этого проекта наоборот: перед каждой генерацией узнать цену и баланс, и записать в журнал. Правило проекта из `CLAUDE.md` сильнее навыка.
- Если оценка пакета выше 45 кредитов, выкинуть позиции с конца списка приоритетов. Если одна генерация стоит больше 10 кредитов, остановиться и спросить владельца.
- В коде и конфигурациях нет комментариев (`pnpm check:comments` должен проходить).
- Токены и ключи в репозиторий не попадают.

## Подготовка

1. `git fetch origin claude/kind-euler-wqednx && git checkout claude/kind-euler-wqednx && git pull`
2. Навыки Higgsfield уже лежат в `.claude/skills/`. CLI: `npm install -g @higgsfield/cli` (или установщик из README навыка).
3. `higgsfield auth login`, затем `higgsfield account status`. Записать баланс кредитов до начала.
4. Для каждой позиции сначала `higgsfield generate cost ...` (синтаксис в `.claude/skills/higgsfield-generate/SKILL.md`), потом генерация.

## Бренд

Концепция «After-dark precision»: тёмная сцена, точные данные, один яркий сигнал.

- Холст: тёплый чёрно-фиолетовый `#0A0812`.
- Бренд: градиент ультрафиолет → маджента, `#7A5CFF` → `#FF4FD8`.
- Акценты: лайм `#B6FF3B` (играет сейчас), янтарь.
- Текст в изображения не вставляем (надписи потом делаются настоящими шрифтами). Реальных брендов, логотипов, читаемых QR-кодов и узнаваемых лиц не должно быть.
- Аудитория: бары, клубы, кафе Узбекистана. Уместны абстрактные геометрические световые узоры в духе икат, без буквального этнографического изображения.

## Что генерировать (по приоритету)

| #   | Файл                                             | Формат              | Ориентир по кредитам |
| --- | ------------------------------------------------ | ------------------- | -------------------- |
| 1   | `logo-mark-a`, `logo-mark-b`, `logo-mark-c`      | квадрат, тёмный фон | до 25 суммарно       |
| 2   | `hero-landing`                                   | 16:9, максимум 2K   | до 20                |
| 3   | `hero-phone-table` (опционально)                 | 4:5                 | из остатка           |
| 4   | `backdrop-lounge`, `backdrop-cafe` (опционально) | 16:9                | из остатка           |

Запас минимум 15 кредитов оставить на доработки.

Запросы (английский, править под выбранную модель):

- Логотип-знак: `Minimal flat vector-style logo mark for a music request app called Joy Music. A single bold geometric shape combining a sound-wave equalizer and a location pin, gradient from ultraviolet #7A5CFF to magenta #FF4FD8, centered on a solid near-black #0A0812 background, generous empty space, no text, no letters, no drop shadow, crisp edges, works at 16px and 512px.` Вариации: буква J из столбиков эквалайзера; виниловая пластинка со штырём; QR-подобная сетка, превращающаяся в звуковую волну.
- `hero-landing`: `Cinematic wide shot of an empty premium nightclub dance floor just before the crowd arrives, deep ink-black interior with a warm violet tint, sweeping ultraviolet and magenta light beams through fine haze, glossy black floor with soft reflections, a DJ booth silhouette far in the background, subtle geometric light patterns inspired by Central Asian ikat projected on the back wall, shallow depth of field, no people in focus, no text, no logos, moody premium editorial photography.`
- `hero-phone-table`: `Close-up of a hand holding a smartphone above a dark cocktail bar table, the screen glowing with a blurred abstract violet and magenta music interface, light spilling onto the glass and fingers, background bokeh of club lights, no readable text, no QR code, no brand marks.`
- `backdrop-lounge`: тот же дух, тёплое золото на чёрном, бархат и латунь. `backdrop-cafe`: мягкий тёплый свет, эспрессо-тона, светлая тема.

## Обработка результата

- Оригиналы сохранить в `packages/brand/assets/generated/originals/`.
- Для веба сделать `webp`: `hero-landing` шириной 2560 и 1280, плюс крошечный размытый placeholder (до 2 КБ). Использовать `sharp` (доступен в воркспейсе после `pnpm install`), скрипт положить в `packages/brand/scripts/`.
- Записать `packages/brand/assets/generated/manifest.json`: файл, точный запрос, модель, стоимость в кредитах, баланс до и после.
- Написать краткий `packages/brand/assets/generated/SPEND.md`: итог трат и остаток из 60.
- Выбор логотипа и интеграцию в интерфейс не делать: в облачной сессии знак параллельно рисуется вручную в SVG (`packages/brand`). Задача этого задания только принести лучшие варианты и материалы для лендинга.

## Как закончить

1. `pnpm install && pnpm check:comments && pnpm format:check`
2. Трогать только `packages/brand/assets/generated/`, `packages/brand/scripts/` и этот файл. Остальные каталоги в ветке меняются параллельно.
3. `git pull --rebase origin claude/kind-euler-wqednx`, коммит, `git push origin claude/kind-euler-wqednx`. PR не создавать.
4. В итоговом сообщении: что сгенерировано, сколько потрачено, сколько осталось из 60, какие файлы лучше всего подходят для логотипа и героя.
