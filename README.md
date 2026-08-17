# ikorka-sysadmin

Панель сисадміна: облік техніки, задачі на день, задачі від керівника.
Фронтенд на Vite + React, деплой на GitHub Pages. Дані й PIN-логін —
через API `task-dashboard-backend` (Railway), не в цьому репозиторії.

## Локальний запуск

```bash
npm install
npm run dev
```

За замовчуванням фронт стукається в продакшн-бекенд
(`task-dashboard-backend` на Railway). Щоб вказати інший бекенд локально,
створи `.env.local`:

```
VITE_API_URL=http://localhost:3000/api
```

## Деплой

Автоматичний при пуші в `main` через `.github/workflows/deploy.yml` →
GitHub Pages. В налаштуваннях репозиторію: **Settings → Pages → Source →
GitHub Actions**.

## PIN-и

`OWNER_PIN` і `SYSADMIN_PIN` — змінні середовища на бекенді (Railway),
не в цьому репозиторії і не в коді.
