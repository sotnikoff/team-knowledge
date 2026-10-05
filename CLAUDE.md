# Team Knowledge — редактор диаграмм

Клон Excalidraw: список досок + «рисованный от руки» редактор диаграмм
(Vite + React 19 + TypeScript strict + Tailwind v4, рендер на canvas через roughjs).

## Команды

```bash
npm run dev        # dev-сервер
npm run build      # tsc -b + vite build
npm run typecheck  # только проверка типов
npm test           # vitest: domain, editor, контракт репозитория, архитектура
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

## Слои и правило зависимостей

```
src/
  domain/          Сущности и чистая логика: Board, элементы, геометрия, доменные ошибки.
                   Не импортирует НИЧЕГО (ни другие слои, ни npm-пакеты).
  application/     Порты (интерфейсы), use cases, логика редактора (EditorModel,
                   history, viewport, scene). Импортирует только domain. Без пакетов.
  infrastructure/  Адаптеры портов: persistence (DTO, mapper, localStorage), system
                   (id, часы). Импортирует application и domain.
  presentation/    React: страницы, canvas, инструменты, хуки, store. Импортирует
                   application и domain. Infrastructure — ТОЛЬКО из
                   presentation/app/container.ts (composition root).
```

Зависимости направлены только внутрь. Правило проверяет `src/architecture.test.ts`
— если он упал, исправляйте импорт, а не тест.

## Слой персистентности (самое важное)

- Порт: `application/ports/BoardRepository.ts`. Его форма **повторяет будущий REST**:
  `list → GET /boards` (summary без элементов), `get → GET /boards/:id`,
  `create → POST /boards`, `save → PUT /boards/:id` с `If-Match: version`,
  `delete → DELETE /boards/:id`.
- **Всё асинхронно**, даже поверх синхронного localStorage. UI уже обрабатывает
  loading/error, поэтому сеть ничего в нём не изменит.
- **Оптимистичная конкурентность**: `save` проходит, только если `board.version`
  совпадает с сохранённой; иначе `BoardConflictError`. Успешный save возвращает
  доску с `version + 1` — следующий save строится от неё (так делает `useAutosave`).
- **Id генерирует клиент** (порт `IdGenerator`), бэк их принимает.
- **Доменные ошибки** (`domain/shared/errors.ts`): адаптер обязан переводить свои
  сбои (QuotaExceeded, битый JSON, 404/409/5xx) в `BoardNotFoundError`,
  `BoardConflictError`, `BoardAlreadyExistsError`, `StorageUnavailableError`.
  UI знает только их (`presentation/errors.ts`).
- **Wire-формат общий для всех адаптеров**: `infrastructure/persistence/dto/BoardDto.ts`
  + `boardMapper.ts` (сериализация, валидация входящих данных, `schemaVersion`).
  Это и есть JSON-контракт с бэком.
- **Контрактный тест-сьют** `application/ports/BoardRepository.contract.ts` —
  единый для всех реализаций (Liskov). Новый адаптер обязан его пройти.
- Серверное состояние в UI — через TanStack Query (`presentation/hooks`), кэш
  обновляется из ответов use cases.

### Чек-лист: переход на HTTP

1. `infrastructure/persistence/http/HttpBoardRepository.ts implements BoardRepository`:
   `fetch` + `boardToDto`/`boardFromDto`/`summaryFromDto`; статусы → доменные ошибки
   (404 → NotFound, 409/412 → Conflict, сеть/5xx → StorageUnavailable).
2. `HttpBoardRepository.test.ts`: `runBoardRepositoryContract(...)` поверх мок-сервера
   (например, msw).
3. В `presentation/app/container.ts` раскомментировать ветку `case 'http'`.
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
- **L** — любой `BoardRepository` проходит один контрактный сьют.
- **I** — узкие порты (`BoardRepository`, `IdGenerator`, `Clock`); UI получает
  use cases через `AppDependencies`, а не репозиторий.
- **D** — use cases зависят от портов; конкретные классы связываются только в
  `presentation/app/container.ts` и передаются через `DependenciesProvider`.

## Редактор

- Вся логика — чистые функции в `application/editor/editorModel.ts`
  (`EditorModel` → `EditorModel`). `presentation/editor/store.ts` (zustand) лишь
  делает модель реактивной: `dispatch(...transitions)`, `useEditor(selector)`.
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
