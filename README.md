## QuantSandbox / Formula field

Веб‑приложение для визуализации результатов гипероптимизации / бэктестов в виде матрицы‑теплокарты 25×25 с поддержкой drill‑down до 3 уровней вложенности. Данные для построения берутся из таблицы `public.Heatmap` в Neon PostgreSQL, либо из моков при недоступности базы.

### Стек

- **Frontend**: React, Vite, Radix UI Themes.
- **Backend**: Node.js, Express, `pg`, Neon PostgreSQL.
- **Прочее**: Vite dev‑proxy для `/api`, кастомный движок матрицы (mixed‑radix ранги, бакетизация 25×25, агрегации).

### Структура проекта

| Каталог / файл | Назначение |
| --- | --- |
| **Корень** | |
| `index.html` | HTML‑точка входа. |
| `package.json` | Зависимости и скрипты (`dev`, `build`, `preview`, `lint`, `server`). |
| `vite.config.js` | Конфиг Vite, прокси `/api` → backend (`http://localhost:3001`). |
| `.env.example` | Пример настроек окружения (`DATABASE_URL`, `SERVER_PORT`). |

#### `src/` – frontend

| Файл / каталог | Назначение |
| --- | --- |
| `main.jsx` | Точка входа React. Подключает Radix `Theme`, глобальные стили и `App`. |
| `App.jsx` | Корневой компонент приложения: верхний бар, навигация между страницами **Matrix Heatmap** и **Quant**. |
| `index.css`, `colors.css`, `App.css` | Глобальные и тематические стили приложения и страницы матрицы. |
| `pages/QuantPage.jsx` | Страница «Quant» (отдельный экран под эксперименты/формулы). |

##### `src/components/MatrixHeatmap/` – модуль тепловой карты

| Файл | Назначение |
| --- | --- |
| `index.jsx` | Контейнер модуля: состояние осей X/Y и агрегатора, стек узлов drill‑down, кэш матриц по узлам, вызов API `postMatrixBuild`. Отрисовывает хлебные крошки, кнопки **Reset** / **Show JSON**, теплокарту и инспектор. |
| `AxisConfig.jsx` | UI для конфигурации осей X/Y и выбора агрегации (`MIN`, `AVG`, `MAX`) на Radix UI компонентах. |
| `HeatmapGrid.jsx` | Сетка 25×25, оси и подписи, вычисление цветов по 5‑ступенчатому градиенту (красный → зелёный), тултипы для ячеек и делений осей, обработка клика по ячейке (drill‑down). |
| `Inspector.jsx` | «Node inspector» под матрицей: диапазоны параметров по осям для текущего узла, общее число комбинаций, `min / max / avg` score, количество заполненных ячеек. |
| `Breadcrumb.jsx` | Хлебные крошки вида `Root › Level 1 › Level 2 › Level 3`, переход на нужный уровень стека узлов. |

##### Другие frontend‑модули

| Файл / каталог | Назначение |
| --- | --- |
| `api/matrixApi.js` | Клиентский API для построения матрицы: забирает записи из `/api/db/heatmap/records` (Neon) или генерирует моки, вызывает `buildMatrix` и возвращает `{ node, cells, summary }`. Для root‑уровня заполняет пустые ячейки синтетическим значением. |
| `lib/matrixEngine.js` | Ядро расчётов: подготовка осей (`prepareAxis`), mixed‑radix ранги (`computeRank`), маппинг ранга в бакет (`rankToBucket` / `getBucketRange`), построение матрицы (`buildMatrix`), создание иерархии узлов (`createRootNode`, `drillDown`), обратное восстановление диапазонов параметров (`getParamValueRangesForRankRange`). Все агрегаты по score округлены до 3 знаков. |
| `data/parameterSpecs.js` | Описание параметров (ключ, тип, домен `min/max/step`, метка, группа, индикатор). Диапазоны и шаги синхронизированы с сид‑скриптом БД. |
| `data/mockRecords.js` | Генерация мок‑записей (включая контролируемое распределение score) на случай отсутствия соединения с Neon. |

#### `server/` – backend

| Файл | Назначение |
| --- | --- |
| `server/index.js` | Express‑сервер. Создаёт пул `pg` к `process.env.DATABASE_URL`, предоставляет маршруты: здоровье (`/api/db/health`), список таблиц (`/api/db/tables`), описание колонок (`/api/db/table/:schema/:table`), выборка heatmap‑записей (`/api/db/heatmap/records`) с маппингом колонок БД на ключи приложения и упорядочиванием по `id`. |
| `server/seed-heatmap.js` | Скрипт заполнения `public."Heatmap"`: генерирует все уникальные комбинации 6 параметров (MACD и Bollinger Bands), добавляет `UNIQUE`‑ограничение по параметрам и присваивает score с распределением 40/30/20/10. |

### Поток данных

Логика взаимодействия фронтенда, бэкенда и движка матрицы:

```mermaid
flowchart LR
  user["User"]
  ui["MatrixHeatmap (index.jsx)"]
  apiClient["matrixApi.postMatrixBuild"]
  backend["Express server (server/index.js)"]
  db["Neon PostgreSQL (public.Heatmap)"]
  engine["matrixEngine.buildMatrix"]

  user -->|"Выбор осей, клик по ячейке"| ui
  ui -->|"POST /matrixBuild (из кода)|" apiClient
  apiClient -->|"/api/db/heatmap/records"| backend
  backend -->|SELECT| db
  db -->|rows| backend
  backend -->|"records []"| apiClient
  apiClient -->|"records, axisConfig, node"| engine
  engine -->|"node, cells, summary"| ui
```

Результат `buildMatrix` кэшируется по комбинации (оси + узел) и используется одновременно для отрисовки теплокарты/инспектора и для модалки **Show JSON** (JSON всегда соответствует текущему отображаемому уровню).

### Запуск и окружение

- Установить зависимости:
  - `npm install`
- Подготовить окружение:
  - создать `.env` из `.env.example`;
  - задать `DATABASE_URL` для Neon, при необходимости `SERVER_PORT` (по умолчанию `3001`).
- Запустить backend:
  - `npm run server` (Express + подключение к Neon).
- Запустить frontend:
  - `npm run dev` (Vite dev‑server, по умолчанию `http://localhost:5173`, с прокси `/api` на backend).
- (Опционально) заполнить БД:
  - `node server/seed-heatmap.js` для генерации ~450k записей в `public."Heatmap"`.

### Важные замечания

- Диапазоны параметров в `src/data/parameterSpecs.js` должны соответствовать диапазонам в `server/seed-heatmap.js`, иначе ранги и распределение по ячейкам будут неверными.
- Максимальная глубина drill‑down ограничена 3 уровнями (Root, Level 1, Level 2, Level 3) и задаётся в `src/components/MatrixHeatmap/index.jsx`.
- При недоступности Neon приложение автоматически переключается на генерацию мок‑данных, сохраняя структуру матрицы.
