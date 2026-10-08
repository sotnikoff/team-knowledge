# Team Knowledge — спецификация HTTP API для бэкенда

Документ описывает API, которое ждёт фронтенд. Сейчас фронтенд хранит данные в
localStorage. Переход на сервер — это один HTTP-адаптер на каждый порт
(`src/application/ports/*Repository.ts`). Формы запросов и ответов ниже **совпадают
с текущим форматом хранения** (`src/infrastructure/persistence/dto/`), поэтому JSON можно
хранить как есть.

Поведение, которое API обязано соблюдать, проверяет общий контрактный тест-сьют
(`src/application/ports/repository.contract.ts`). HTTP-адаптер должен его пройти так же,
как localStorage-адаптер.

По каждой операции отдельно (`get_projects`, `update_board`, …) с заголовками и примерами
JSON — [`backend-api-operations.md`](./backend-api-operations.md).

---

## 1. Общие правила

| Что | Правило |
|---|---|
| Формат | `Content-Type: application/json; charset=utf-8`, тела — UTF-8 JSON. |
| Базовый URL | Задаётся на фронте `VITE_API_URL`. Все пути ниже — относительно него. |
| Идентификаторы | Строки. **Назначает сервер** при создании; рекомендуется UUID v4. Клиент id сущностей не генерирует. |
| Даты | ISO-8601 в UTC с миллисекундами: `"2026-10-06T12:04:31.123Z"`. |
| `createdAt` / `updatedAt` | Ставит сервер. При `PUT` клиент присылает свои значения — сервер их **игнорирует**: `createdAt` не меняется, `updatedAt` = время сохранения. |
| `version` | Целое ≥ 1, токен оптимистичной блокировки (раздел 3). Новая сущность — `1`, каждое успешное изменение — `+1`. |
| `schemaVersion` | Версия формата тела у проектов, зарисовок, досок и документов, сейчас везде `1`. Клиент отклоняет ответ, где `schemaVersion` больше известного ему. Сервер возвращает то, что сохранил. |
| Названия | `name` проекта, зарисовки и доски, `title` документа: после `trim()` от 1 до **100** символов. Клиент проверяет сам, но сервер обязан проверить тоже (раздел 4). |
| Списки | Конверт `Page<T>` с курсорной пагинацией (раздел 2.1). Клиент сам сортирует по `updatedAt`, новые первыми. |
| Авторизация | `Authorization: Bearer <accessToken>` на **всех** эндпоинтах, кроме `/auth/*`. Токен (JWT) выдаёт `POST /auth/verify` (раздел 2.3). Нет токена, он просрочен или отозван → `401`. Сущности к пользователям пока не привязаны (раздел 9). |

### Иерархия

```
Project (проект)
 └─ Space (зарисовка)          space.projectId → project.id
     ├─ Board (доска)          board.spaceId   → space.id
     └─ Document (документ)    document.spaceId → space.id
```

Родитель **не хранит** список детей: ребёнок ссылается на родителя по id. Внутри родителя — плоский список.

---

## 2. Эндпоинты

Столбец «Функция» — use case на фронте, который вызывает этот эндпоинт.

| # | Функция | Метод и путь | Тело запроса | Успех |
|---|---|---|---|---|
| 1 | `ListProjects` | `GET /projects?limit=&cursor=` | — | `200` `Page<ProjectDto>` |
| 2 | `OpenProject` | `GET /projects/{projectId}` | — | `200` `ProjectDto` |
| 3 | `CreateProject` | `POST /projects` | `ProjectDraft` | `201` `ProjectDto` |
| 4 | `RenameProject` | `PUT /projects/{projectId}` | `ProjectDto` | `200` `ProjectDto` |
| 5 | `DeleteProject` | `DELETE /projects/{projectId}` | — | `204` |
| 6 | `ListSpaces` | `GET /projects/{projectId}/spaces?limit=&cursor=` | — | `200` `Page<SpaceDto>` |
| 7 | `OpenSpace` | `GET /spaces/{spaceId}` | — | `200` `SpaceDto` |
| 8 | `CreateSpace` | `POST /projects/{projectId}/spaces` | `SpaceDraft` | `201` `SpaceDto` |
| 9 | `RenameSpace` | `PUT /spaces/{spaceId}` | `SpaceDto` | `200` `SpaceDto` |
| 10 | `DeleteSpace` | `DELETE /spaces/{spaceId}` | — | `204` |
| 11 | `ListBoards` | `GET /spaces/{spaceId}/boards?limit=&cursor=` | — | `200` `Page<BoardSummaryDto>` |
| 12 | `OpenBoard` | `GET /boards/{boardId}` | — | `200` `BoardDto` |
| 13 | `CreateBoard` | `POST /spaces/{spaceId}/boards` | `BoardDraft` | `201` `BoardDto` |
| 14 | `SaveBoardContent`, `RenameBoard` | `PUT /boards/{boardId}` | `BoardDto` | `200` `BoardDto` |
| 15 | `DeleteBoard` | `DELETE /boards/{boardId}` | — | `204` |
| 16 | `ListDocuments` | `GET /spaces/{spaceId}/documents?limit=&cursor=` | — | `200` `Page<DocumentSummaryDto>` |
| 17 | `OpenDocument` | `GET /documents/{documentId}` | — | `200` `DocumentDto` |
| 18 | `CreateDocument` | `POST /spaces/{spaceId}/documents` | `DocumentDraft` | `201` `DocumentDto` |
| 19 | `SaveDocumentContent`, `RenameDocument` | `PUT /documents/{documentId}` | `DocumentDto` | `200` `DocumentDto` |
| 20 | `DeleteDocument` | `DELETE /documents/{documentId}` | — | `204` |
| 21 | `RequestLoginCode` | `POST /auth/code` | `{ email }` | `204` |
| 22 | `VerifyLoginCode` | `POST /auth/verify` | `{ email, code }` | `200` `SessionDto` |
| 23 | `CompleteProfile` | `PUT /me` | `{ name, company }` | `200` `UserDto` |

### 2.1. Списки: конверт и курсор

Все четыре списка (1, 6, 11, 16) отдают один и тот же конверт:

```ts
interface Page<T> {
  items: T[]                 // элементы этой страницы
  nextCursor: string | null  // курсор следующей страницы; null = это последняя
  total?: number             // необязательно: сколько всего элементов в коллекции
}
```

Параметры запроса:

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `limit` | целое 1…200 | `100` | сколько элементов на страницу; больше 200 — сервер урезает до 200 |
| `cursor` | строка | нет (= первая страница) | значение `nextCursor` из предыдущего ответа |

Правила:
- **Курсор непрозрачный.** Клиент его не разбирает и не собирает, только передаёт обратно, URL-кодированным. Из чего его собирать — ниже, в «Как устроен курсор».
- **Порядок стабильный.** Рекомендуется `createdAt ASC, id ASC`: ключи не меняются при правках, поэтому листание не пропускает и не дублирует элементы, а новые попадают в конец. Сортировку для показа клиент делает сам.
- **Курсор, который не удаётся разобрать**, — `400` с `code: "INVALID_CURSOR"`. Клиент один раз начинает листание заново с первой страницы.
- **Несуществующий родитель** — `200 { "items": [], "nextCursor": null }`, а не `404` (так требует контракт).
- **`total`** клиенту сейчас не нужен. Если отдаёте, то это число на момент запроса.
- **Пока данных мало**, сервер может отдавать всё одной страницей с `nextCursor: null`. Клиенту без разницы: включить настоящую пагинацию можно позже, не трогая фронт.

Что делает клиент: HTTP-адаптер запрашивает страницы, пока `nextCursor` не станет `null`, склеивает `items` и убирает дубли по `id`. Для остального приложения список по-прежнему целый, порты и UI не меняются.

```http
GET /spaces/2bb3…/boards?limit=100 HTTP/1.1
```

```json
{ "items": [ { "id": "1ca2…", "spaceId": "2bb3…", "name": "Схема оплаты", "version": 12, "createdAt": "…", "updatedAt": "…" } ],
  "nextCursor": "eyJjIjoiMjAyNi0xMC0wNlQxMjowNTowMC4wMDBaIiwiaSI6IjFjYTJlMDdmLTcyMjQtNDBlNC04OTkxLTBhZWE5MDc3NGU2MSJ9",
  "total": 137 }
```

#### Как устроен курсор

Курсор — закладка «последним на прошлой странице был вот этот элемент». Рекомендуемый формат — JSON с двумя полями последнего элемента страницы, закодированный в **base64url без `=` на конце** (RFC 4648, §5). Такая строка вставляется в URL без экранирования.

| Поле | Значение |
|---|---|
| `c` | `createdAt` последнего элемента страницы, строка ISO-8601, **с той же точностью, с какой время хранится в базе** |
| `i` | `id` последнего элемента страницы |

Курсор из примера выше раскодируется в:

```json
{"c":"2026-10-06T12:05:00.000Z","i":"1ca2e07f-7224-40e4-8991-0aea90774e61"}
```

Как сервер обрабатывает запрос списка:

1. `limit`: нет — `100`; больше `200` — `200`; меньше `1` или не число — `400 INVALID_DATA`.
2. `cursor`: нет — выдача с начала. Есть — раскодировать base64url, разобрать JSON, проверить, что `c` — дата, а `i` — строка. Не получилось — `400 INVALID_CURSOR`.
3. Выбрать на одну запись больше, чем `limit`. Лишняя запись нужна только для того, чтобы узнать, есть ли продолжение. Для досок:

   ```sql
   SELECT * FROM boards
   WHERE space_id = :spaceId
     AND (created_at, id) > (:c, :i)   -- только если пришёл cursor
   ORDER BY created_at, id
   LIMIT :limit + 1
   ```

   Для документов — то же с таблицей `documents`. Для зарисовок фильтр по `project_id`. У проектов родителя нет, остаётся только условие курсора. Если база не умеет сравнивать пары, условие записывается так: `created_at > :c OR (created_at = :c AND id > :i)`. Нужен индекс `(родитель, created_at, id)`.
4. Пришло больше `limit` записей — лишнюю отбросить, `nextCursor` собрать из **последней оставшейся**. Пришло `limit` или меньше — `nextCursor: null`.
5. `total`, если отдаёте: `count(*)` по тому же родителю, без условия курсора.

Тонкости:
- Курсор хранит значения, а не ссылку на запись. Если эту запись потом удалили, курсор продолжает работать.
- Точность времени в курсоре должна совпадать с точностью в базе. Если база хранит микросекунды, а в курсор попадут миллисекунды, записи на границе страниц задвоятся или потеряются. Либо кладите в `c` время с полной точностью, либо округляйте `created_at` до миллисекунд уже при записи.
- Формат курсора — внутреннее дело сервера, его можно менять: клиент на содержимое не смотрит. Подписывать или шифровать не обязательно. Подделанный курсор только сдвинет выдачу, а мусор сервер отклонит с `400 INVALID_CURSOR`.

### 2.2. Особенности по группам

**Списки (1, 6, 11, 16).**
- Формат и курсор — раздел 2.1.
- `ListBoards` и `ListDocuments` отдают **summary**, то есть без `elements` и без `content`. Тяжёлое содержимое приходит только из `GET` по id.

**Создание (3, 8, 13, 18).**
- Тело — черновик: всё, кроме `id`, `version`, `createdAt`, `updatedAt`.
- Родитель берётся **из пути**. Если в теле тоже есть `projectId`/`spaceId`, они совпадают с путём; при расхождении приоритет у пути.
- Если родителя нет: `404` с `entity` родителя.
- Ответ — созданная сущность целиком, с id и `version: 1`. Клиент сразу открывает её по этому id.

**Сохранение (4, 9, 14, 19)** — `PUT` **полной** сущности. Переименование доски или документа тоже отправляет полный объект, вместе с `elements`/`content`.
- Изменяемые поля:
  - проект: `name`;
  - зарисовка: `name`;
  - доска: `name`, `elements`;
  - документ: `title`, `content`.
- `projectId`/`spaceId` при `PUT` не меняются: перенос между родителями не поддерживается, сервер их игнорирует или отвечает `422`.
- Ответ — сохранённая сущность с `version + 1` и новым `updatedAt`.

**Удаление (5, 10, 15, 20).**
- `DELETE /projects/{id}` **каскадно** удаляет все зарисовки проекта, а с ними их доски и документы.
- `DELETE /spaces/{id}` каскадно удаляет доски и документы зарисовки.
- Каскад делает сервер одним запросом. Клиент детей сам не перебирает.
- Удаление документа **не** трогает доски. Карточки этого документа на досках остаются, клиент показывает «Документ удалён».

---

### 2.3. Аутентификация (вход = регистрация)

Без паролей: пользователь вводит email, получает на почту 6-значный код и вводит его. Если аккаунта
с этим email не было, `POST /auth/verify` его создаёт — отдельной регистрации нет. У нового
пользователя `name: null`: фронтенд показывает форму «имя + компания» и не пускает дальше, пока
она не отправлена (`PUT /me`). Порт — `src/application/ports/AuthGateway.ts`, контрактный сьют —
`authGateway.contract.ts`.

```ts
interface UserDto {
  id: string
  email: string            // trim + lowercase, ≤ 254 символов
  name: string | null      // null — профиль ещё не заполнен
  company: string | null   // необязательно
  createdAt: string        // ISO-8601 UTC
}

interface SessionDto {
  accessToken: string      // JWT; клиент его не разбирает, только шлёт в Authorization
  expiresAt: string        // ISO-8601 UTC, = exp токена
  user: UserDto
}
```

| Эндпоинт | Тело | Успех | Ошибки |
|---|---|---|---|
| `POST /auth/code` | `{ "email": "ann@example.com" }` | `204`; письмо с кодом. Новый запрос делает прежний код недействительным | `422 INVALID_EMAIL`, `429` (слишком часто — фронт сам не даёт повторить раньше 30 с) |
| `POST /auth/verify` | `{ "email": "ann@example.com", "code": "123456" }` | `200 SessionDto`; аккаунт создаётся при первом входе | `422 INVALID_CODE` с `reason`: `format` (не 6 цифр), `wrong` (не тот), `expired` (истёк или исчерпаны попытки) |
| `PUT /me` | `{ "name": "Анна", "company": "Acme" }` (`company` может быть `null`) | `200 UserDto` | `401`, `422 INVALID_NAME` (имя 1–100 символов после `trim`, компания ≤ 100) |

Рекомендации серверу: код живёт ~10 минут, не больше 5 попыток ввода, одноразовый. Срок жизни
токена — на усмотрение сервера (фронт смотрит на `expiresAt`, в local-режиме — 30 дней). Выход —
только на клиенте (забыть токен), эндпоинт не нужен.

В режиме localStorage сервера нет: `LocalAuthGateway` принимает **любой** 6-значный код, кроме
`000000` (так проверяется «неверный код»), пользователей хранит в `tk3:users`, а токен — неподписанный
JWT (`alg: none`) с `sub`, `email`, `iat`, `exp`. Local-репозитории токен получают и игнорируют.

---

## 3. Оптимистичная конкурентность (`version`)

1. Клиент читает сущность и запоминает её `version`.
2. `PUT` отправляет заголовок `If-Match: "<version>"` и то же число в поле `version` тела.
3. Сервер **атомарно** сравнивает его с сохранённой версией:
   - совпало: сохраняет с `version + 1`, отвечает `200` с новой сущностью;
   - не совпало: `409 Conflict` (допустим и `412 Precondition Failed`), ничего не меняет.
4. Следующий `PUT` клиент строит **от ответа** предыдущего.

Как этим пользуется клиент:
- **Автосохранение** доски или документа: debounce, не больше одного `PUT` одновременно. Пока запрос идёт, правки копятся.
- **Переименование** — отдельный `PUT`, который тоже повышает версию. Клиент подхватывает новую версию в своём кэше, поэтому автосохранение после переименования конфликт не получает.
- **Конфликт** (`409`/`412`): клиент показывает «есть более новая версия» и предлагает загрузить актуальную. Сервер ничего не сливает.

Пример — сохранение доски версии 7:

```http
PUT /boards/0f6c…e1 HTTP/1.1
If-Match: "7"
Content-Type: application/json

{ "schemaVersion": 1, "id": "0f6c…e1", "spaceId": "9a1d…", "name": "Оплата", "version": 7,
  "createdAt": "2026-10-01T09:00:00.000Z", "updatedAt": "2026-10-06T12:04:31.123Z",
  "elements": [ … ] }
```

```http
HTTP/1.1 200 OK
ETag: "8"

{ …то же…, "version": 8, "updatedAt": "2026-10-06T12:04:31.480Z" }
```

---

## 4. Ошибки

Тело ошибки (клиент опирается на статус, `code` — для логов и уточнения):

```json
{ "error": { "code": "NOT_FOUND", "message": "board \"0f6c…\" not found", "entity": "board", "id": "0f6c…" } }
```

| Ситуация | Статус | `code` | Ошибка на фронте |
|---|---|---|---|
| Нет токена, он просрочен или отозван | `401` | `UNAUTHORIZED` | `UnauthorizedError` → выход, экран входа |
| Неверный email при входе | `422` | `INVALID_EMAIL` | `InvalidEmailError` |
| Неверный / истёкший код | `422` | `INVALID_CODE` (+ `reason`: `format` / `wrong` / `expired`) | `InvalidCodeError` |
| Сущности или родителя нет | `404` | `NOT_FOUND` (+ `entity`: `project` / `space` / `board` / `document`, `id`) | `NotFoundError` |
| `version` / `If-Match` не совпали | `409` или `412` | `VERSION_CONFLICT` | `VersionConflictError` |
| Пустое или длиннее 100 символов название | `422` | `INVALID_NAME` | `InvalidNameError` |
| Тело не соответствует схеме (раздел 5–6) | `400` | `INVALID_DATA` | `StorageUnavailableError` (это баг клиента) |
| `cursor` в списке не удаётся разобрать | `400` | `INVALID_CURSOR` | адаптер начинает листание заново; при повторе — `StorageUnavailableError` |
| Сеть, таймаут, `5xx`, `413` | — | — | `StorageUnavailableError` («повторить») |

`GET`/`PUT`/`DELETE` несуществующего id → `404`, в том числе повторный `DELETE`.

---

## 5. Схемы сущностей

Общие поля всех сущностей (`VersionedDto`):

```ts
interface VersionedDto {
  id: string
  version: number        // ≥ 1
  createdAt: string      // ISO-8601 UTC
  updatedAt: string      // ISO-8601 UTC
}
```

### Project

```ts
interface ProjectDraft { name: string }                       // POST /projects
interface ProjectDto extends VersionedDto { schemaVersion: 1; name: string }
```

### Space (зарисовка)

```ts
interface SpaceDraft { name: string; projectId?: string }     // POST /projects/{projectId}/spaces
interface SpaceDto extends VersionedDto { schemaVersion: 1; projectId: string; name: string }
```

### Board (доска)

```ts
interface BoardDraft { schemaVersion?: 1; spaceId?: string; name: string; elements: ElementDto[] } // обычно []
interface BoardSummaryDto extends VersionedDto { spaceId: string; name: string }  // в списках
interface BoardDto extends BoardSummaryDto { schemaVersion: 1; elements: ElementDto[] }
```

### Document (документ)

```ts
interface DocumentDraft { schemaVersion?: 1; spaceId?: string; title: string; content: RichTextNodeDto }
interface DocumentSummaryDto extends VersionedDto { spaceId: string; title: string } // в списках
interface DocumentDto extends DocumentSummaryDto { schemaVersion: 1; content: RichTextNodeDto }
```

Новый документ клиент создаёт с `content = { "type": "doc", "content": [{ "type": "paragraph" }] }`.

---

## 6. Содержимое: элементы доски и текст документа

Серверу **не нужно понимать** содержимое. Достаточно проверить общую форму (раздел 7) и
хранить его как есть (например, `jsonb`). Ниже — справочник, чтобы валидировать и не
терять данные.

### 6.1. `ElementDto` (элемент доски)

Порядок элементов в массиве — **порядок слоёв**: последний рисуется сверху. Сервер обязан
сохранять порядок. Id элементов генерирует **клиент**, они уникальны в пределах доски.

Общие поля всех элементов:

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | id элемента |
| `type` | `rectangle` \| `ellipse` \| `diamond` \| `line` \| `arrow` \| `freedraw` \| `text` \| `document` \| `tech` | тип |
| `x`, `y`, `width`, `height` | number | рамка в координатах доски; `width`/`height` ≥ 0 |
| `seed` | number | зерно «рукописности» |
| `style` | `ElementStyleDto` | стиль |

```ts
interface ElementStyleDto {
  strokeColor: string            // CSS-цвет, напр. "#1e1e1e"
  fillColor: string              // CSS-цвет или "transparent"
  fillStyle?: 'hachure' | 'cross-hatch' | 'solid'   // нет = 'hachure'
  strokeWidth: number
  roughness: number              // 0 ровно … 2 очень небрежно
}
```

Поля по типам (необязательные поля могли отсутствовать в старых данных, клиент подставляет значения по умолчанию):

| `type` | Дополнительные поля |
|---|---|
| `rectangle`, `ellipse`, `diamond` | `label?: string` (по умолчанию `""`) |
| `tech` | `kind`: `service` \| `database` \| `cache` \| `queue` \| `storage` \| `function` \| `server` \| `gateway` \| `loadBalancer` \| `external` \| `web` \| `mobile` \| `user`; `label?: string` |
| `line`, `arrow` | `points: {x,y}[]` (относительно `x,y`; концы + точки изгиба); `curved?: boolean` (`false`); `label?: string`; `startBinding?`, `endBinding?: { elementId: string, anchor: 'top'\|'right'\|'bottom'\|'left' } \| null`; `startArrowhead?`, `endArrowhead?: 'arrow'\|'triangle'\|'dot'\|'diamond'\|'bar' \| null` |
| `freedraw` | `points: {x,y}[]` |
| `text` | `text: string`; `fontSize: number` |
| `document` | `documentId: string` — ссылка на документ **той же зарисовки**; содержимое берётся из документа |

Наконечники `startArrowhead`/`endArrowhead` различают три состояния, их **нельзя
схлопывать**:
- **поле отсутствует** — старые данные: у `arrow` наконечник в конце, у `line` — нет;
- **`null`** — наконечник убран пользователем;
- **строка** — выбранный вид наконечника.

`elementId` в привязках ссылается на элемент той же доски. Сервер ссылочную целостность не
проверяет: клиент сам снимает привязку, если цели нет.

### 6.2. `RichTextNodeDto` (текст документа)

JSON-дерево в формате ProseMirror/TipTap. Корень всегда `{"type": "doc", …}`.

```ts
interface RichTextNodeDto {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNodeDto[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}
```

Сейчас используются:
- **узлы:** `doc`, `paragraph`, `heading` (`attrs.level` 1–6), `text`, `bulletList`, `orderedList`, `listItem`, `taskList`, `taskItem` (`attrs.checked`), `blockquote`, `codeBlock` (`attrs.language`), `horizontalRule`, `hardBreak`;
- **отметки (`marks`):** `bold`, `italic`, `strike`, `underline`, `code`, `link` (`attrs.href`).

Список может расшириться, поэтому сервер **не должен** отклонять неизвестные `type`.

---

## 7. Что валидировать на сервере (минимум)

- Типы и обязательные поля сущностей из раздела 5.
- Названия: `trim()`, длина от 1 до 100 → иначе `422 INVALID_NAME`. Сохранять уже обрезанное.
- `version` в `PUT` — целое; сравнение атомарное (раздел 3).
- `elements` — массив объектов с `id` (string) и `type` (string). `content` — объект с `type: "doc"`.
- Неизвестные поля внутри `elements` и `content` **сохранять как есть**: так старый сервер не потеряет новые возможности клиента.
- Лимит тела `PUT /boards/{id}` — не меньше **5 МБ**: на доске могут быть тысячи элементов, линии карандаша содержат много точек. При превышении — `413`.

---

## 8. Реализация на клиенте (для сверки)

1. `src/infrastructure/persistence/http/Http{Project,Space,Board,Document}Repository.ts`: `fetch` + существующие маппер'ы из `dto/` (`*ToDto`, `*FromDto`), статусы → доменные ошибки по таблице раздела 4. `list` листает `Page<T>` до `nextCursor: null` (раздел 2.1).
2. Контрактные тесты `runVersionedRepositoryContract(...)` поверх мок-сервера (например, msw), с теми же сценариями, что для localStorage.
3. `src/infrastructure/auth/HttpAuthGateway.ts` (`implements AuthGateway`) + `runAuthGatewayContract(...)`. Все HTTP-адаптеры получают `AccessTokenProvider` (в контейнере это `sessions`) и шлют `Authorization: Bearer`; `401` → `UnauthorizedError`.
4. `presentation/app/container.ts` → ветка `case 'http'`; `.env`: `VITE_PERSISTENCE=http`, `VITE_API_URL=…`.

---

## 9. Вне рамок / открытые вопросы

- **Права доступа** (кто видит какие проекты) — не определены: аутентификация есть (раздел 2.3), но у сущностей пока нет `userId`/владельца. Когда появятся, запрет — `403`; `401` клиент уже обрабатывает.
- **Совместное редактирование в реальном времени** не предусмотрено: модель — «последний успешный `PUT` с верной версией», конфликты решает пользователь.
- **Перенос** зарисовки в другой проект и доски/документа в другую зарисовку не поддерживается.
- **Файлы и картинки** не хранятся: экспорт PNG/JPEG/BMP делается на клиенте.
