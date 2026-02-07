# AdRotator — Баннерокрутилка

Самостоятельный сервис для управления и показа рекламных баннеров. Аналог Яндекс Сетки / Google AdSense.

## Архитектура

| Компонент | Технологии | Порт |
|-----------|-----------|------|
| **Ad Server** | Fastify, TypeScript, PostgreSQL, Redis | 3000 |
| **Админка** | React 19, Vite, Tailwind CSS | 5173 |
| **Web SDK** | Vanilla JS (~3KB) | — |
| **Nginx** | Reverse proxy, раздача SDK | 80 |

## Видимые показы (Viewable Impressions) — отчётность

AdRotator считает **видимый показ** по стандарту MRC/IAB: ≥50% баннера в зоне видимости ≥1 сек. Это **метрика для отчётов и аналитики**, а не обязательная единица биллинга: тарификация по умолчанию остаётся по обычным показам, чтобы не снижать выручку паблишеров.

- **SDK** через Intersection Observer отправляет трекинг на `/api/track/viewable/:id` при выполнении условий.
- В **админке** отображаются «Видимые показы» и **Viewability %** по кампаниям и площадкам.
- При желании можно вводить отдельные кампании с биллингом по viewable и повышенным CPM — см. [критический разбор](docs/VIEWABLE-CRITIQUE.md).

## Быстрый старт (Docker)

```bash
# Клонируйте репозиторий
cd adrotator

# Скопируйте конфиг
cp .env.example .env

# Запустите все сервисы
docker compose up --build -d
```

Откройте:
- **Админка**: http://localhost
- **API**: http://localhost/api/health
- **SDK**: http://localhost/sdk/ad.js

## Как протестировать

### Вариант 1: Быстрая проверка (скрипт + браузер)

1. **Запустите сервисы** (если ещё не запущены):
   ```bash
   docker compose up -d
   ```

2. **Прогон API** (создаёт тестовые кампанию, креатив, площадку и проверяет выдачу баннера):
   ```bash
   chmod +x e2e/api-test.sh   # один раз
   ./e2e/api-test.sh http://127.0.0.1/api
   ```
   В конце должно быть: `=== Все проверки пройдены ===`.

3. **В браузере:**
   - **Админка:** http://127.0.0.1/ — дашборд, списки кампаний/креативов/площадок.
   - **Тест баннера:** http://127.0.0.1/sdk/test.html — должна отобразиться картинка 300×250 (зона `e2e-zone`). Клик по баннеру ведёт на example.com, показы и клики пишутся в статистику.

### Вариант 2: Ручной сценарий через админку

1. Откройте http://127.0.0.1/ → **Кампании** → **+ Новая кампания**. Название: «Тест», статус: Активна → **Создать**.

2. **Креативы** → **+ Новый креатив**. Выберите созданную кампанию, название «Баннер 1», тип «Изображение». В поле «Или URL изображения» вставьте, например: `https://via.placeholder.com/300x250?text=Test`, URL перехода: `https://example.com` → **Создать**.

3. **Площадки** → **+ Новая площадка**. Название: «Сайдбар», Zone Key: `sidebar-1`. В блоке «Креативы в ротации» отметьте «Баннер 1» → **Создать**.

4. Откройте тестовую страницу. Чтобы показывался ваш баннер, на ней должна использоваться зона с тем же `zone_key`. Либо откройте http://127.0.0.1/sdk/test.html и временно измените в коде страницы `data-ad-zone="e2e-zone"` на `data-ad-zone="sidebar-1"`, либо создайте площадку с Zone Key `e2e-zone` и привяжите к ней креатив — тогда тестовая страница покажет ваш баннер без правок.

5. На **Дашборде** (http://127.0.0.1/) посмотрите «Показов сегодня» и «Кликов сегодня» — они обновляются после просмотра и кликов по баннеру.

### Проверка API вручную

```bash
# Здоровье
curl http://127.0.0.1/api/health

# Сводка статистики
curl http://127.0.0.1/api/stats/summary

# Выдача баннера для зоны (после создания площадки с zone_key e2e-zone или sidebar-1)
curl http://127.0.0.1/api/serve/e2e-zone
```

Подробнее: [e2e/README.md](e2e/README.md).

## Локальная разработка (без Docker)

```bash
# Запустите PostgreSQL и Redis (например, через Docker)
docker compose up postgres redis -d

# Сервер
cd server
npm install
npm run dev

# Админка (другой терминал)
cd admin
npm install
npm run dev
```

## Как работает

### 1. Создайте кампанию
В админке (http://localhost → Кампании → Новая кампания): укажите название, бюджет, даты.

### 2. Загрузите креативы
Кампании → Креативы → Новый креатив: загрузите баннер (изображение или HTML), укажите размер и URL перехода.

### 3. Создайте площадку
Площадки → Новая площадка: задайте `zone_key` (например `sidebar-300x250`), привяжите креативы.

### 4. Вставьте код на сайт
Скопируйте сгенерированный сниппет и вставьте на свой сайт:

```html
<div data-ad-zone="sidebar-300x250"></div>
<script src="http://localhost/sdk/ad.js" data-server="http://localhost"></script>
```

### 5. Смотрите статистику
На дашборде отображаются показы, клики, CTR по дням.

## API

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/campaigns` | Список кампаний |
| POST | `/campaigns` | Создать кампанию |
| PUT | `/campaigns/:id` | Обновить кампанию |
| DELETE | `/campaigns/:id` | Удалить кампанию |
| GET | `/creatives` | Список креативов |
| POST | `/creatives` | Создать креатив |
| POST | `/creatives/upload` | Загрузить изображение |
| PUT | `/creatives/:id` | Обновить креатив |
| DELETE | `/creatives/:id` | Удалить креатив |
| GET | `/placements` | Список площадок |
| POST | `/placements` | Создать площадку |
| POST | `/placements/:id/creatives` | Привязать креативы |
| PUT | `/placements/:id` | Обновить площадку |
| DELETE | `/placements/:id` | Удалить площадку |
| GET | `/serve/:zoneKey` | Получить баннер (JSON) |
| GET | `/serve/:zoneKey/html` | Получить баннер (iframe) |
| GET | `/track/impression/:id` | Трекинг показа (1x1 GIF) |
| GET | `/track/click/:id` | Трекинг клика + редирект |
| GET | `/stats/summary` | Сводная статистика |
| GET | `/stats/daily?days=30` | Дневная статистика |
| POST | `/stats/flush` | Сброс счётчиков из Redis в БД |

## Web SDK

### Автоматический режим
```html
<div data-ad-zone="ZONE_KEY"></div>
<script src="http://your-server/sdk/ad.js" data-server="http://your-server"></script>
```

### Программный режим
```javascript
AdRotator.init({ server: 'http://your-server' });
AdRotator.load('zone-key', document.getElementById('banner'));
AdRotator.refresh(); // перезагрузить все баннеры
```

SDK автоматически:
- Ищет все `[data-ad-zone]` элементы
- Загружает баннеры через JSON API
- Отслеживает показы (tracking pixel)
- Перехватывает клики (redirect через сервер)
- Работает с SPA (MutationObserver)

## Ротация
Креативы выбираются **взвешенным случайным образом**. У каждого креатива есть поле `weight` — чем больше вес, тем чаще показ.

## Структура проекта
```
adrotator/
├── docker-compose.yml
├── .env.example
├── nginx/nginx.conf
├── sdk/ad.js            ← Web SDK
├── server/              ← Ad Server (Fastify + TS)
│   ├── Dockerfile
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── db.ts
│       ├── redis.ts
│       ├── migrate.ts
│       ├── migrations/001_initial.sql
│       └── routes/
│           ├── campaigns.ts
│           ├── creatives.ts
│           ├── placements.ts
│           ├── serve.ts
│           ├── track.ts
│           └── stats.ts
└── admin/               ← Админка (React + Vite)
    ├── Dockerfile
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── components/Layout.tsx
        └── pages/
            ├── Dashboard.tsx
            ├── Campaigns.tsx
            ├── CampaignForm.tsx
            ├── Creatives.tsx
            ├── CreativeForm.tsx
            ├── Placements.tsx
            └── PlacementForm.tsx
```
# adrotator
