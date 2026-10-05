# Team Knowledge — зарисовки: доски и документы

Зарисовки (в коде — `Space`), в каждой — доски с диаграммами в стиле Excalidraw
(canvas + roughjs) и текстовые документы с минимальным WYSIWYG (TipTap), как
страницы в Confluence. Vite + React 19 + TypeScript strict + Tailwind v4.

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
Space (зарисовка)            domain/space/Space.ts
 ├─ Board (доска)  *         domain/board/Board.ts        — ссылается через spaceId
 └─ Document (документ) *    domain/document/Document.ts  — ссылается через spaceId
```

- Зарисовка **не хранит** список детей: доски и документы указывают на неё через
  `spaceId` (как `GET /spaces/:id/boards`). Внутри зарисовки — плоский список.
- Все сущности `Versioned` (`domain/shared/versioned.ts`): `id`, `version`, `createdAt`,
  `updatedAt`. Имена валидирует общий `normalizeName` (`domain/shared/name.ts`).
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
  | `SpaceRepository` | `list, get, create, save, delete` | `/spaces`, `/spaces/:id` |
  | `BoardRepository` | `list(spaceId), get, create, save, delete` | `GET /spaces/:spaceId/boards`, `/boards/:id` |
  | `DocumentRepository` | `list(spaceId), get, create, save, delete` | `GET /spaces/:spaceId/documents`, `/documents/:id` |

  `save` → `PUT` с `If-Match: version`. `list` возвращает summary без тяжёлого содержимого.
- **`SpaceRepository.delete` удаляет зарисовку вместе со всеми её досками и
  документами** — часть контракта порта (на бэке это каскад на сервере, один запрос).
  Use case `DeleteSpace` ничего не перебирает сам.
- Создание доски/документа проверяет, что зарисовка существует (`NotFoundError`).
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
- **Id генерирует клиент** (порт `IdGenerator`), бэк их принимает.
- **Доменные ошибки** (`domain/shared/errors.ts`): адаптер обязан переводить свои
  сбои (QuotaExceeded, битый JSON, 404/409/5xx) в `NotFoundError`,
  `VersionConflictError`, `AlreadyExistsError` (у всех есть `entity: space | board |
  document` и `id`), `InvalidNameError`, `StorageUnavailableError`.
  UI знает только их (`presentation/errors.ts`).
- **Wire-формат общий для всех адаптеров**: `infrastructure/persistence/dto/`
  (`*Dto.ts` + `*Mapper.ts`: сериализация, валидация входящих данных, `schemaVersion`;
  общие гарды — `common.ts`). Это и есть JSON-контракт с бэком.
- **Контрактный тест-сьют** `application/ports/repository.contract.ts`
  (`runVersionedRepositoryContract`) — единый для всех репозиториев и всех реализаций
  (Liskov). Новый адаптер обязан его пройти.
- localStorage-адаптеры — тонкие обёртки над `LocalCollection` (индекс summary +
  JSON на объект, версии, перевод ошибок). Ключи с префиксом `tk2:`; данные старого
  формата (`tk:*`) удаляет `purgeLegacyData` при старте.
- Серверное состояние в UI — через TanStack Query (`presentation/hooks`), кэш
  обновляется из ответов use cases.

### Чек-лист: переход на HTTP

1. `infrastructure/persistence/http/Http{Space,Board,Document}Repository.ts`,
   каждый `implements` свой порт: `fetch` + существующие mapper'ы из `dto/`; статусы →
   доменные ошибки (404 → NotFound, 409/412 → VersionConflict, сеть/5xx →
   StorageUnavailable). Каскадное удаление зарисовки делает сервер.
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

Маршруты (`presentation/app/App.tsx`): `/` — список зарисовок; `/spaces/:spaceId` —
`SpaceLayout` (боковая панель с досками и документами + `<Outlet/>`): index — обзор,
`boards/:boardId` — редактор доски, `docs/:documentId` — документ.

Автосохранение (`presentation/hooks/useAutosave.ts`) — одно на доски и документы:
debounce, не больше одного запроса одновременно, побеждают последние данные, база
следующего save — результат предыдущего.

## Документы

- `presentation/documents/RichTextEditor.tsx` — TipTap + StarterKit, **без постоянного
  тулбара**: markdown-шорткаты (`# `, `- `, `1. `, `> `) и мини-панель при выделении
  (`SelectionToolbar.tsx`: жирный, курсив, зачёркнутый, код, H1, H2, списки, цитата).
  Новое форматирование — новая запись в массиве `actions`.
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
- Элементы иммутабельны; `elementRenderers` кэширует roughjs-drawable в `WeakMap`
  по ссылке на элемент — никогда не мутируйте элементы на месте.
- Seed хранится в элементе, чтобы «рукописность» не прыгала между рендерами.
- Шорткаты завязаны на `KeyboardEvent.code` (работают в любой раскладке).

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

### Как добавить тип фигуры

1. `domain/element/types.ts` — интерфейс + в union `DiagramElement` + `ELEMENT_TYPES`.
2. `domain/element/geometry.ts` — запись в `geometryHandlers`.
3. `presentation/canvas/elementRenderers.ts` — запись в `elementRenderers`.
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
- UI-тексты на русском.
