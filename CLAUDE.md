# Team Knowledge — проекты, зарисовки: доски и документы

Проекты (`Project`) содержат зарисовки (в коде — `Space`), в каждой зарисовке — доски с диаграммами в стиле Excalidraw
(canvas + roughjs) и текстовые документы с минимальным WYSIWYG (TipTap), как
страницы в Confluence. Vite + React 19 + TypeScript strict + CSS Modules (без Tailwind).

## Команды

```bash
npm run dev        # dev-сервер
npm run build      # tsc -b + vite build
npm run typecheck  # только проверка типов
npm test           # vitest: domain, editor, use cases, контракты репозиториев, архитектура
npm run lint       # oxlint
```

Перед тем как считать задачу выполненной: `npm run typecheck && npm test && npm run lint`.

## Философия

1. **Гексагональная архитектура (ports & adapters).** Ядро (domain + application)
   ничего не знает про React, браузер, localStorage или HTTP. Всё внешнее —
   адаптеры за портами.
2. **Персистентность заменяема без правок ядра и UI.** Сейчас данные лежат в
   localStorage, потом будет HTTP-бэкенд. Переход = новый адаптер + одна ветка
   в composition root. Если для этого приходится трогать что-то ещё — архитектура
   нарушена, чините её, а не обходите.
3. **SOLID — не лозунг, а проверяемые правила** (см. ниже, многое проверяют тесты
   и компилятор).
4. **Чистые функции и неизменяемые данные.** Элементы и модель редактора —
   readonly; любое изменение = новый объект. Это даёт дешёвый undo/redo,
   кэширование отрисовки по ссылке и простые тесты.

## Модель данных

```
Project (проект)                   domain/project/Project.ts
 └─ Space (зарисовка) *           domain/space/Space.ts        — ссылается через projectId
     ├─ Board (доска)  *          domain/board/Board.ts        — ссылается через spaceId
     └─ Document (документ) *     domain/document/Document.ts  — ссылается через spaceId
```

- Родитель **не хранит** список детей: зарисовки указывают на проект через `projectId`,
  доски и документы на зарисовку — через `spaceId` (как `GET /projects/:id/spaces`,
  `GET /spaces/:id/boards`). Каждый уровень — плоский список.
- Все сущности `Versioned` (`domain/shared/versioned.ts`): `id`, `version`, `createdAt`,
  `updatedAt`. Имена валидирует общий `normalizeName` (`domain/shared/name.ts`).
- Новая сущность в домене — **черновик** `Draft<T>` (всё, кроме identity): `newProject`, `newSpace`,
  `newBoard`, `newDocument`. Id, первую версию и даты назначает тот, кто её сохраняет
  (`Repository.create(draft)` → готовая сущность), — как сервер на `POST`.
- Для списков есть лёгкие проекции без тяжёлого содержимого: `BoardSummary` (без
  `elements`), `DocumentSummary` (без `content`).
- Текст документа — `RichText` (`domain/document/richText.ts`): нейтральное JSON-дерево
  в формате ProseMirror. Domain не зависит от TipTap; связь «RichText ↔ TipTap JSON»
  только в `presentation/documents/richTextAdapter.ts`.

## Слои и правило зависимостей

```
src/
  domain/          Сущности и чистая логика: Space, Board, Document, элементы, геометрия,
                   доменные ошибки.
                   Не импортирует НИЧЕГО (ни другие слои, ни npm-пакеты).
  application/     Порты (интерфейсы), use cases (usecases/spaces|boards|documents),
                   логика редактора досок (EditorModel, history, viewport, scene).
                   Импортирует только domain. Без пакетов.
  infrastructure/  Адаптеры портов: persistence (DTO, mapper, localStorage), system
                   (id, часы). Импортирует application и domain.
  presentation/    React: страницы, canvas, инструменты, редактор документов (TipTap),
                   хуки, store. Импортирует
                   application и domain. Infrastructure — ТОЛЬКО из
                   presentation/app/container.ts (composition root).
```

Зависимости направлены только внутрь. Правило проверяет `src/architecture.test.ts`
— если он упал, исправляйте импорт, а не тест.

## Слой персистентности (самое важное)

- Три порта, форма каждого **повторяет будущий REST**:

  | Порт | Методы | REST |
  |---|---|---|
  | `ProjectRepository` | `list, get, create, save, delete` | `/projects`, `/projects/:id` |
  | `SpaceRepository` | `list(projectId), get, create, save, delete` | `GET /projects/:projectId/spaces`, `/spaces/:id` |
  | `BoardRepository` | `list(spaceId), get, create, save, delete` | `GET /spaces/:spaceId/boards`, `/boards/:id` |
  | `DocumentRepository` | `list(spaceId), get, create, save, delete` | `GET /spaces/:spaceId/documents`, `/documents/:id` |

  `create(draft)` → `POST` черновика, ответ — созданная сущность с id от сервера.
  `save` → `PUT` с `If-Match: version`. `list` возвращает summary без тяжёлого содержимого.
- **Удаление каскадное и входит в контракт порта** (на бэке это каскад на сервере, один
  запрос): `ProjectRepository.delete` удаляет проект с его зарисовками и их досками/документами,
  `SpaceRepository.delete` — зарисовку с досками и документами. Use cases `DeleteProject`/
  `DeleteSpace` ничего не перебирают сами. В localStorage каскад зарисовок — одна функция
  `deleteSpacesCascade` (`LocalStorageSpaceRepository.ts`), её зовут оба репозитория.
- Создание зарисовки проверяет, что проект существует; доски/документа — что существует
  зарисовка (`NotFoundError`).
- **Всё асинхронно**, даже поверх синхронного localStorage. UI уже обрабатывает
  loading/error, поэтому сеть ничего в нём не изменит.
- **Оптимистичная конкурентность**: `save` проходит, только если `entity.version`
  совпадает с сохранённой; иначе `VersionConflictError`. Успешный save возвращает
  сущность с `version + 1` — следующий save строится от неё (так делает `useAutosave`).
- **Переименование и автосохранение не конфликтуют.** Переименование идёт отдельным
  use case и тоже повышает версию. `useAutosave` следит за кэшем: если там появилась
  более новая версия того же объекта (например, переименовали из боковой панели),
  она становится базой следующего сохранения. Содержимое при этом не теряется:
  save кладёт текущее содержимое поверх свежей базы.
- **Id сущностей (зарисовок, досок, документов) назначает хранилище, не клиент.** Генерация
  UUID — особенность только localStorage-адаптера: у него нет сервера, поэтому
  `LocalCollection` получает `LocalIdentity { ids, clock }` и сам играет роль сервера
  при `create`. Container создаёт её только в ветке `case 'local'`; HTTP-адаптерам она
  не нужна. Порт `IdGenerator` в UI остаётся только для id **элементов доски** (фигуры,
  стрелки) — они часть содержимого доски, при любом бэкенде их создаёт клиент.
- **Доменные ошибки** (`domain/shared/errors.ts`): адаптер обязан переводить свои
  сбои (QuotaExceeded, битый JSON, 404/409/5xx) в `NotFoundError`,
  `VersionConflictError` (у обеих есть `entity: project | space | board | document` и `id`),
  `InvalidNameError`, `StorageUnavailableError`.
  UI знает только их (`presentation/errors.ts`).
- **Wire-формат общий для всех адаптеров**: `infrastructure/persistence/dto/`
  (`*Dto.ts` + `*Mapper.ts`: сериализация, валидация входящих данных, `schemaVersion`;
  общие гарды — `common.ts`). Это и есть JSON-контракт с бэком.
- **Контрактный тест-сьют** `application/ports/repository.contract.ts`
  (`runVersionedRepositoryContract`) — единый для всех репозиториев и всех реализаций
  (Liskov). Новый адаптер обязан его пройти.
- localStorage-адаптеры — тонкие обёртки над `LocalCollection` (индекс summary +
  JSON на объект, версии, перевод ошибок). Ключи с префиксом `tk3:`; данные старых
  форматов (`tk:*` — до зарисовок, `tk2:*` — зарисовки без проектов) удаляет `purgeLegacyData`
  при старте.
- Серверное состояние в UI — через TanStack Query (`presentation/hooks`), кэш
  обновляется из ответов use cases.

### Чек-лист: переход на HTTP

1. `infrastructure/persistence/http/Http{Project,Space,Board,Document}Repository.ts`,
   каждый `implements` свой порт: `fetch` + существующие mapper'ы из `dto/`
   (`create` шлёт черновик и разбирает ответ сервера — id генерировать не нужно); статусы →
   доменные ошибки (404 → NotFound, 409/412 → VersionConflict, сеть/5xx →
   StorageUnavailable). Каскадное удаление проекта и зарисовки делает сервер.
2. Тесты: `runVersionedRepositoryContract(...)` для каждого поверх мок-сервера
   (например, msw) — те же сценарии, что и для localStorage.
3. В `presentation/app/container.ts` заполнить ветку `case 'http'` в `createRepositories`.
4. `.env`: `VITE_PERSISTENCE=http`, `VITE_API_URL=...`.

Больше ничего менять не нужно. Не добавляйте в порт методы «под localStorage»
и не протаскивайте `fetch`/`Response`/HTTP-коды выше infrastructure.

## SOLID в коде

- **S** — один use case = один класс с `execute` (`application/usecases`); геометрия,
  история, viewport, рендер, инструменты — отдельные модули.
- **O** — поведение по типу элемента задаётся реестрами:
  `domain/element/geometry.ts → geometryHandlers` (hit-test, resize),
  `presentation/canvas/elementRenderers.ts → elementRenderers`,
  `presentation/canvas/tools/index.ts → tools`. Новый тип/инструмент = новая запись,
  без `switch` по всему коду. Mapped types заставят компилятор потребовать запись.
- **L** — любой репозиторий проходит один контрактный сьют.
- **I** — узкие порты (`SpaceRepository`, `BoardRepository`, `DocumentRepository`,
  `IdGenerator`, `Clock`); UI получает use cases через `AppDependencies`, а не репозиторий.
- **D** — use cases зависят от портов; конкретные классы связываются только в
  `presentation/app/container.ts` и передаются через `DependenciesProvider`.

## Интерфейс

Маршруты (`presentation/app/routes.tsx`, **плоские**): `/` — список проектов;
`/projects/:projectId` — зарисовки проекта (обе страницы — общий `pages/CollectionPage.tsx`);
`/spaces/:spaceId` —
`SpaceLayout` (боковая панель с досками и документами + `<Outlet/>`): index — обзор,
`boards/:boardId` — редактор доски, `docs/:documentId` — документ. Зарисовка знает свой
`projectId`, поэтому ссылка «назад» в боковой панели ведёт в её проект (с его названием).
Боковую панель можно свернуть в узкую полоску (кнопка в её шапке); состояние —
настройка этого браузера (`pages/useSidebarCollapsed.ts`, localStorage, как и тема).

Автосохранение (`presentation/hooks/useAutosave.ts`) — одно на доски и документы:
debounce, не больше одного запроса одновременно, побеждают последние данные, база
следующего save — результат предыдущего.
Статус сохранения (`components/SaveStatus.tsx`) — только цветная точка, текст в подсказке;
при ошибке/конфликте точка — кнопка (повторить / загрузить актуальную). Название доски
переименовывается кликом прямо на доске (`editor/BoardTitle.tsx`, тот же `RenameBoard`).

## Загрузка и чанки

- **Маршруты грузятся лениво** (`presentation/app/routes.tsx`, React Router `lazy`): в
  стартовом чанке только оболочка — список проектов, страница проекта и `SpaceLayout` с боковой панелью.
  Обзор зарисовки, редактор доски (roughjs, холст, экспорт) и документ (TipTap,
  подсветка кода) — отдельные чанки. Новая тяжёлая страница — тоже через `lazy`, не
  статическим импортом в `routes.tsx`/`App.tsx`.
- После события `load` в простое (`prefetchPagesWhenIdle`) эти чанки подгружаются в фоне,
  поэтому переход на доску/документ не ждёт сети.
- Вендоры — отдельные долгоживущие чанки (`vite.config.ts → codeSplitting.groups`):
  `vendor-react` (react, router, query, zustand), `vendor-editor` (tiptap, prosemirror),
  `vendor-highlight` (lowlight, highlight.js), `vendor-rough`. Новую тяжёлую библиотеку
  добавляйте в подходящую группу.
- Шрифты — `<link>` с `preconnect` в `index.html`, не `@import` в CSS (цепочка запросов
  блокирует отрисовку).
- Ориентир: стартовый JS ≈ 123 КБ gzip (было 353 КБ одним файлом).

## Дизайн-система и темы

Стиль — «чертёжный» (инженерная тетрадь / blueprint): холодная бумага в миллиметровку,
тёмно-синие чернила, кобальтовый акцент и жёлтый маркер (`--marker`), чёткие углы и
жёсткие тени без размытия. Заголовки Space Grotesk, интерфейс IBM Plex Sans,
номера/метаданные/код IBM Plex Mono, холст — рукописный Caveat. Тёмная тема — «ночной
чертёж»: глубокий почти чёрно-синий фон, белые линии, жёлтый акцент.
**Tailwind не используется.**

- **Токены** — `src/styles/tokens.css`: цвета (`--paper`, `--sheet`, `--spread`, `--ink*`,
  `--line*`, `--accent*`, `--marker`, `--danger`…), сетка доски (`--grid-minor/major`),
  типографика, отступы (шкала 4px), радиусы, тени, анимации, z-index. Тёмная тема —
  только переопределение токенов под `.dark` (класс ставит `presentation/theme/theme.ts`).
- Глобальные стили — `src/styles/`: `base.css` (reset, фокус `:focus-visible` через
  `outline` — `box-shadow` компоненты перебивают), `document.css` (`.document-prose`,
  цвета highlight.js), `board.css` (`.board-ink`). Подключаются из `src/index.css`.
- **Компоненты** — `Component.module.css` рядом с `Component.tsx`; условные классы —
  `ui/cx.ts`. В модулях только `var(--…)`, никаких захардкоженных цветов (исключение —
  палитра элементов доски в `StylePanel`: это данные).
- **Примитивы `presentation/ui/`** — использовать их, а не голые элементы: `Button`
  (+ `buttonClass` для ссылок), `IconButton`, `Panel`, `Input`, `Select`,
  `SegmentedControl`, `Popover` (закрывается по Escape и клику снаружи), `TitleRule`.
- Глобальные (не модульные) классы оставлены там, где их ищут извне: `.document-prose`
  (TipTap, статический рендер, экспорт), `.document-card`, `.board-ink`.
- **Холст:** цвета элементов хранятся «светлыми», тема на данные не влияет. В тёмной теме
  canvas, inline-редактор текста и образцы цветов (класс `board-ink`) показываются через
  `filter: invert(93%) hue-rotate(180deg)`, как в Excalidraw. Миллиметровка — фон
  контейнера доски (`editor/Editor.module.css`), не canvas.
- Тема по умолчанию системная, выбор хранится в localStorage (`team-knowledge:theme` —
  настройка интерфейса, мимо портов). Экспорт в картинку — в теме, выбранной в меню
  экспорта, а не в теме интерфейса: `rasterizeHtml` собирает CSS страницы (включая CSS-модули)
  и добавляет класс `dark` только для тёмного экспорта.

## Локализация (ru / en / de)

- `presentation/i18n/`: своя лёгкая i18n без библиотек. `ru.ts` — исходный словарь,
  его ключи задают `MessageKey`; `en.ts`/`de.ts` типизированы как `Messages`, поэтому
  пропущенный или лишний ключ — ошибка компиляции. Плейсхолдеры `{name}`
  (`t('export.selectionCount', { count })`); тест проверяет, что они совпадают во всех языках.
- `useI18n()` → `{ language, t }`. Перерисовываются только компоненты, которые его
  вызывают, — состояние редактора при смене языка не теряется. Хелперы вне React
  получают `t`/`I18n` параметром (`errorMessage(error, t)`, `formatUpdated(date, i18n)`).
- Язык по умолчанию — из `navigator.languages`, иначе английский; ручной выбор —
  `LanguageSelect` (главная и низ боковой панели), хранится как тема
  (`team-knowledge:language`). `<html lang>` и `document.title` выставляются там же.
- **Любой новый текст интерфейса — только через ключ во всех трёх словарях.** Пользовательские
  данные (названия досок, документов) не переводятся: «Без названия» при создании
  берётся на текущем языке и дальше остаётся как есть.
- Термины: проект = Project / Projekt; зарисовка = Space (en) / Bereich (de); доска = Board.

## Документы

- **Одна схема документа** — `presentation/documents/extensions.ts`
  (`documentExtensions()`): StarterKit (с подчёркиванием и ссылками), блоки кода
  `CodeBlockLowlight` + `lowlight`, чек-листы. Её используют и редактор, и статический
  рендер карточек на доске — меняйте только здесь.
- `RichTextEditor.tsx`: **постоянный тулбар** сверху (`EditorToolbar.tsx`, sticky) +
  мини-панель при выделении (`SelectionToolbar.tsx`). Обе панели строятся из общих
  `formatActions.tsx`; состояние кнопок — `useFormatState`. Новое форматирование —
  новая запись в `formatActions` (+ кнопка в группе тулбара).
- Блок кода: кнопка или ```` ``` ````; язык выбирается в тулбаре (список
  `CODE_LANGUAGES`), подсветка lowlight + тема highlight.js (подключена в `index.css`).
- Типографика — собственные стили `.document-prose` в `index.css` (одинаковые в
  редакторе и на карточке).
- Заголовок документа переименовывается отдельно (`RenameDocument`, по blur/Enter);
  Enter переводит фокус в текст.

## Редактор досок

- Вся логика — чистые функции в `application/editor/editorModel.ts`
  (`EditorModel` → `EditorModel`). `presentation/editor/store.ts` (zustand) лишь
  делает модель реактивной: `dispatch(...transitions)`, `useEditor(selector)`.
- Store один на приложение и принадлежит «сессии» редактора: `Editor` загружает доску
  в layout-эффекте (`resetEditor(elements, session)`) и рендерит содержимое, только
  когда store принадлежит его сессии. Так никто, в первую очередь автосохранение,
  не увидит элементы предыдущей доски.
- Непрерывные действия (рисование, перетаскивание, ресайз, ввод текста):
  `beginInteraction` → `updateLive`… → `endInteraction` = **один** шаг undo.
  Дискретные изменения (удаление, стиль) — `commit`.
- Инструмент = `Tool.begin(input, ctx)` → `ToolSession { move, end }`.
- Жест рисующего инструмента, который ничего не нарисовал (клик), выделяет элемент
  под курсором и включает «Выделение» (`tools/finishCreation.ts`, параметр `clickedAt`).
  Так линию карандаша можно выбрать для переноса/удаления, не переключая инструмент.
- Элементы иммутабельны; `elementRenderers` кэширует roughjs-drawable в `WeakMap`
  по ссылке на элемент — никогда не мутируйте элементы на месте.
- Seed хранится в элементе, чтобы «рукописность» не прыгала между рендерами.
- Шорткаты завязаны на `KeyboardEvent.code` (работают в любой раскладке).
- Инструменты: буква (V, R, A…) и цифра верхнего ряда по порядку на панели — 1 рука … 9 текст,
  0 компоненты (нумпад не используется). Порядок задаёт один список `TOOLBAR_ORDER`
  (`editor/useEditorShortcuts.ts`): из него строятся и шорткаты, и кнопки `Toolbar`, и цифры
  в углу кнопок (`toolHint`). Новый инструмент — новая запись там.
- `−` / `=` (верхний ряд, без Ctrl) — масштаб холста, как кнопки внизу (`editor/zoom.ts → zoomBy`).

### Заливка и порядок слоёв

- `ElementStyle.fillStyle`: `hachure` (штрихи, по умолчанию) | `cross-hatch` | `solid` —
  передаётся в roughjs (`roughHelpers.ts → roughOptions`), поэтому работает для всех
  фигур и ИТ-компонентов. В JSON поле необязательное (старые данные → `hachure`).
  В панели стилей «Тип заливки» виден, только когда выбран цвет заливки.
- Порядок отрисовки = порядок в `elements` (последний сверху, он же выигрывает hit-test).
  Перестановка — `domain/element/order.ts → reorderElements` (`front | forward | backward |
  back`, относительный порядок выделенных сохраняется); `editorModel.reorderSelected` —
  один шаг undo. «Выше/ниже» перепрыгивает ближайший **перекрывающийся** элемент, иначе
  шаг был бы невидимым. UI: секция «Слои» в панели стилей (для карточек документов —
  единственная; карточку можно положить и над фигурами, и под ними), шорткаты Ctrl/⌘+] / [ и с Shift — до конца.

### Подписи в фигурах

- У rectangle/ellipse/diamond есть `label` (пустая строка = нет подписи). Рисуется по
  центру, с переносом по `labelBox` (`domain/element/geometry.ts`) — та же область
  используется и textarea-редактором, и рендером.
- Редактирование: двойной клик внутри фигуры, Enter на выделенной фигуре или клик
  инструментом «Текст» внутри фигуры (`presentation/editor/textEditing.ts → startEditing`).

### Привязка стрелок и линий

- У line/arrow есть `startBinding`/`endBinding: { elementId, anchor } | null`, где anchor —
  середина стороны (`top | right | bottom | left`) bindable-элемента (фигуры и текст).
  Вся геометрия привязок — `domain/element/binding.ts`.
- **Инвариант:** привязанный конец всегда стоит в `anchorPoint(target, anchor)`. Его
  обеспечивает `syncBindings`, вызываемый в `EditorModel.updateLive/commit` и при
  загрузке — поэтому инструменты и операции над фигурами про стрелки не знают.
  Удалили цель → привязка снимается, стрелка остаётся на месте.
- Стрелка, перемещённая без своей цели, отвязывается (`translateElements → detachBindings`).
- Концы снапятся при рисовании и при перетаскивании концов выделенной стрелки
  (`presentation/canvas/tools/snapping.ts`); Alt — рисовать без привязки.
  `EditorModel.bindingHint` подсвечивает цель и её точки.

### Изгибы линий и стрелок

- `points` линии/стрелки — концы + промежуточные точки изгиба; флаг `curved`: плавная
  кривая (сплайн Catmull–Rom через все точки) или ломаная. Новые линии плавные;
  в старых данных поля нет → `false` (ломаная).
- **Одна геометрия кривой** — `domain/element/curve.ts`: `catmullRomSegments` (Безье-куски)
  и `traceLine` (полилиния). Рендер рисует именно эти Безье (`gen.path`), hit-test и
  границы (`withAbsolutePoints`) считаются по `traceLine` — клик и рамка совпадают с
  видимой линией, включая выпуклость кривой за пределами точек.
- Редактирование — `domain/element/linear.ts` (`insertBend`, `moveLinePoint`, `removeBend`,
  `setCurved`); в UI: маркеры точек и середин сегментов (`canvas/selection.ts →
  lineHandleAt`), тянуть середину — новый изгиб (вставляется при первом движении),
  двойной клик по изгибу — удалить, «Линия: плавная/ломаная» в панели стилей
  (`editorModel.setLinesCurved`). Концы по-прежнему привязываются к фигурам.

### Наконечники линий и стрелок

- У line/arrow есть `startArrowhead`/`endArrowhead: Arrowhead | null` (`arrow | triangle |
  dot | diamond | bar`, `null` = без наконечника). Line и arrow отличаются только
  наконечниками по умолчанию (`createLinear`: у arrow — `arrow` в конце), рисует их один
  `linearDrawables` (`elementRenderers.ts`): направление берётся по касательной кривой,
  заливные наконечники — цветом обводки.
- В UI это `ArrowStyle { sides: end | start | both | none, head }` (`linear.ts → arrowStyleOf /
  withArrowStyle`); секции «Стрелка» и «Наконечник» в панели стилей → `editorModel.setArrowStyle`
  (один шаг undo, запоминается в `EditorModel.arrowStyle` для новых стрелок; инструмент «Линия»
  всегда рисует линию без наконечников).
- JSON: поля необязательные; отсутствие = как раньше (arrow — стрелка в конце, line — без),
  явный `null` = наконечник убран (`boardMapper → parseArrowhead` различает эти случаи).

### Подписи линий и стрелок

- У line/arrow есть `label` (`''` = нет). Стоит в середине длины нарисованной линии
  (`linear.ts → lineLabelAnchor`, учитывает изгибы и кривую) и поэтому следует за
  изгибами и привязанными концами.
- Рендер — `renderLabelledLine` (в `drawElements`, значит и в экспорте): **без фона** —
  линия обрезается clip-маской с «дыркой» по размеру текста, поэтому под подписью видна
  бумага и другие элементы, а линия текст не перечёркивает. Клик по подписи выделяет линию (`lineLabelBox` — приблизительная
  рамка для hit-test, т.к. domain не умеет мерить текст).
- Редактирование: двойной клик по линии или Enter на выделенной (`startEditing`,
  textarea `LineLabelTextArea`). Двойной клик по точке изгиба по-прежнему удаляет изгиб.

### Документ на доске

- `DocumentElement { type: 'document', documentId }` — доска хранит **только ссылку**,
  содержимое берётся из документа (React Query, общий кэш со страницей документа).
- Рисуется не на canvas, а DOM (`presentation/canvas/DocumentCard.tsx`) с
  `transform: scale(zoom) translate(scroll)` — та же формула, что `worldToScreen`.
- **Слои сцены** (`canvas/SceneLayers.tsx`): чтобы порядок слоёв работал и для карточек,
  элементы режутся по документам (`scene.ts → splitAtDocuments`): canvas с рисунками
  под первой карточкой, карточка, следующий canvas… Порядок в DOM = порядок в `elements`.
  Сверху — прозрачный input-canvas (`Canvas.tsx`): ввод (выделение, перемещение,
  привязки) и UI выделения (`renderOverlay`) для всех элементов, включая карточки.
  Все слои перерисовываются по подписке на store (`useLayerCanvas`).
- Карточка всегда показывает документ целиком; её измеренная высота пишется в
  `element.height` (`updateLive`, без шага истории), чтобы hit-test, рамка и привязки
  совпадали с видимым. Resize меняет только ширину (`geometryHandlers.document`).
- Вставка — `InsertDocumentMenu` (существующий документ зарисовки или новый).
  Двойной клик / Enter на карточке → `Canvas.onOpenDocument` → страница документа.
  Удалённый документ — карточка «Документ удалён»; удаление карточки документ не трогает.

### Экспорт в картинку

- Меню «Экспорт» (`components/ExportMenu.tsx`): весь холст или выделенное, PNG / JPEG /
  BMP, масштаб 1–3×. Логика — `presentation/export/`.
- `renderExport` рисует на отдельном canvas то же, что доска, в том же порядке слоёв
  (`splitAtDocuments`: рисунки и карточки вперемешку) через общий `drawElements`;
  `exportImage` = `renderExport` + кодирование.
- **Тема экспорта** (на выбор, независимо от темы интерфейса): светлая — белый фон;
  тёмная — фон `--paper` тёмной темы (читается из токенов), рисунки каждого слоя
  рисуются на отдельном canvas и переносятся с тем же фильтром, что `.dark .board-ink`,
  карточки растеризуются с классом `dark` (`rasterizeHtml(…, dark)`).
- **Превью** (`components/ExportPreview.tsx`) — тот же `renderExport` в масштабе, вписанном
  в окошко меню; подписка на элементы только пока меню открыто.
- Карточки растеризуются `rasterizeHtml`: XHTML-копия карточки + CSS страницы одним
  `<style>` внутри SVG `foreignObject`. Не использовать библиотеки, инлайнящие
  computed styles на каждый элемент: с сотнями CSS-переменных это секунды на
  карточку и зависание вкладки. Веб-шрифты внутри картинки недоступны (системные).
- BMP браузер не кодирует (`toBlob` молча отдаёт PNG) — свой кодировщик `export/bmp.ts`.
- «Копировать PNG» — та же картинка сразу в буфер обмена (`copyImageToClipboard`), всегда
  PNG (другие форматы буфер надёжно не принимает). `ClipboardItem` создаётся синхронно в
  обработчике клика с ещё не готовым `Promise<Blob>` — иначе Safari теряет жест пользователя.

### ИТ-компоненты (проектирование систем)

- Один тип элемента `TechElement { type: 'tech', kind: TechKind }`: сервис, БД, кэш,
  очередь, хранилище, функция, сервер, шлюз, балансировщик, внешняя система, веб,
  мобильный клиент, пользователь. Это фигура (`ShapeElement`): подпись, привязка
  стрелок, заливка и стиль как у прямоугольника; hit-test — по рамке.
- `domain/element/tech.ts`: `TECH_KINDS`, `TECH_LAYOUT` (размер по умолчанию + доля
  рамки под подпись — у «иконочных» видов подпись под глифом), `techLabelBox`.
- Рисунки — `presentation/canvas/techRenderers.ts → drawings` (roughjs, общие хелперы
  в `roughHelpers.ts`); иконки палитры — `components/techIcons.tsx`.
- UI: кнопка «Компоненты» в тулбаре (`TechPalette`) → `chooseTechKind`; инструмент
  `tools/techTool.ts`: клик ставит компонент размера по умолчанию, протяжка задаёт
  размер (Shift — пропорции). Шорткаты K / 0.
- **Новый вид** = значение в `TECH_KINDS` + запись в `TECH_LAYOUT`, `drawings`,
  иконка в `techIcons` и ключ `tech.<kind>` в трёх словарях (mapped types и `Messages`
  не дадут забыть). JSON не меняется: `kind` валидируется `isTechKind`.

### Как добавить тип фигуры

1. `domain/element/types.ts` — интерфейс + в union `DiagramElement` + `ELEMENT_TYPES`.
2. `domain/element/geometry.ts` — запись в `geometryHandlers`.
3. `presentation/canvas/elementRenderers.ts` — запись в `elementRenderers` (если элемент
   рисуется DOM-слоем, как документ, — пустой рендерер и свой слой в `Canvas`).
4. `infrastructure/persistence/dto` — поле в `ElementDto` и ветка в `parseElement`.
   Новые поля делайте необязательными в JSON с дефолтом в mapper — тогда
   старые данные читаются без миграции и `schemaVersion` не меняется.
5. Если элемент можно привязывать — добавить его в `isBindableElement`.
6. При необходимости — инструмент в `presentation/canvas/tools` + кнопка в `Toolbar`.

## Конвенции

- TypeScript strict + `noUncheckedIndexedAccess`; никаких `any`. `erasableSyntaxOnly`:
  без enum и parameter properties — поля класса объявляются явно.
- Импорты между слоями — через алиас `@/`, внутри модуля — относительные.
- domain/application — без React, DOM и `window`; браузерные API только в
  infrastructure/presentation.
- Ошибки — доменные классы, не строки. Не глотать ошибки молча.
- Тесты: unit для domain и application/editor, контрактные для адаптеров,
  архитектурный для границ слоёв. Тестовые файлы — `*.test.ts` рядом с кодом.
- UI-тексты — только через `t(...)` (см. «Локализация»); комментарии в коде — на английском.
