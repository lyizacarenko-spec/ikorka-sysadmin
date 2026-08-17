# ikorka-sysadmin — контекст для Claude Code

## Що це
Панель сисадміна: облік техніки (ноутбуки/навушники/мишки/інше), задачі
на день, задачі від керівника з таймтрекінгом. Фронтенд-only репозиторій
(Vite + React), задеплоєний на GitHub Pages. Дані й авторизація — на
бекенді `task-dashboard-backend` (окремий репозиторій, Railway), у тих
самих таблицях Postgres, що й task-dashboard.

## Навмисно немає в цьому репозиторії
- Жодних реальних імен співробітників чи інвентарних списків — тільки
  структура (`schema.sql` у backend-репо). Реальні дані існують лише в
  Postgres, вводяться через саму панель.
- PIN-кодів — вони тільки на Railway (`OWNER_PIN`, `SYSADMIN_PIN`), клієнт
  просто пересилає введений PIN на `/api/login` і довіряє ролі, яку
  поверне сервер.

## Стек
- Vite + React, `src/App.jsx` — вся логіка UI, `src/api.js` — клієнт до
  backend API (PIN у заголовку `x-pin` на кожен запит).
- Деплой: GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages,
  автоматично при пуші в `main`.
- `vite.config.js`: `base: "/ikorka-sysadmin/"` — має збігатися з назвою
  репозиторію.

## Ролі
- `owner` — бачить і редагує все, єдиний, хто може ставити нові задачі
  від керівника.
- `sysadmin` — та ж панель, повний доступ до техніки й задач на день,
  але не ставить задачі від керівника (тільки бере в роботу/завершує).

## Backend endpoints, якими користується цей фронт
`GET/POST/PATCH/DELETE /api/equipment`, `/api/equipment-log` (GET),
`/api/daily-tasks`, `/api/assigned-tasks` — усі під тим самим API_BASE,
що й task-dashboard. Дивись `task-dashboard-backend/CLAUDE.md` для деталей
бекенду.

## Важливо при змінах
- Не хардкодити PIN або реальні дані техніки/співробітників у код.
- `VITE_API_URL` не секрет (публічний URL бекенду) — можна лишати
  дефолтним у `src/api.js` або переозначати через env на білді.
