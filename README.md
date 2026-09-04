# РПД — Telegram Mini App

Мобильный каталог рабочих программ дисциплин. GitHub Pages раздаёт интерфейс,
`catalog.json` и PDF, а Cloudflare Worker обслуживает Telegram webhook и отправляет
выбранный документ пользователю. Базы данных нет: единственный источник данных —
PDF-файлы в `public/documents/`.

## Требования и команды

- Node.js 22;
- npm из поставки Node.js;
- аккаунты GitHub, Cloudflare и Telegram нужны только для публикации.

Все npm-команды запускаются **только из корня репозитория**. Не выполняйте
`npm install` внутри `apps/web`, `apps/worker` или `packages/shared`.

```bash
npm ci
npm run generate:catalog
npm run dev:web
```

После запуска откройте `http://localhost:5173`. В обычном браузере Telegram API
может отсутствовать — это поддерживаемый fallback: каталог, навигация и открытие
PDF работают, а отправка в чат показывает понятную ошибку об отсутствии Telegram.

Основные проверки и сборка:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` создаёт frontend строго в `apps/web/dist/` и dry-run bundle Worker
в `apps/worker/dist/`. Полная локальная проверка: `npm run verify`.

## Как добавить или обновить РПД

Frontend и Worker не содержат списков дисциплин. Разложите PDF по одной из схем:

```text
public/documents/bachelor/<курс>/<имя файла>.pdf
public/documents/master/corporate-law/<курс>/<имя файла>.pdf
public/documents/master/business-legal-support/<курс>/<имя файла>.pdf
```

Для бакалавриата допустимы курсы `1`–`5`, для магистратуры — `1`–`2`.
Название и код дисциплины берутся из имени PDF. После изменения файлов выполните:

```bash
npm run generate:catalog
git add public/documents public/catalog.json
git commit -m "content: update RPD documents"
git push
```

Генератор рекурсивно сканирует файлы, игнорирует не-PDF и детерминированно
перезаписывает `public/catalog.json`. Неверная структура или коллизия ID останавливает
генерацию. Сообщение `warning [possible-duplicate]` означает вероятный дубликат:
проверьте перечисленные пути; предупреждение не блокирует сборку. `catalog.json` —
производный индекс, его нельзя редактировать вручную. Удаление PDF и повторная
генерация удаляют документ из меню после следующего deploy.

## Локальная настройка

Создайте `apps/web/.env.local` для frontend по публичным значениям из
`.env.example`:

```dotenv
VITE_BASE_PATH=/
VITE_WORKER_URL=https://your-rpd-worker.example.workers.dev/
```

`VITE_WORKER_URL` — только origin Worker, без `/api/send-document`, query, hash или
учётных данных. Для локального Worker замените публичные placeholders в
`apps/worker/wrangler.toml` и запустите из корня:

```bash
npm run dev:worker -- --env dev
```

Dev-конфигурация разрешает ровно указанный `DEV_MINI_APP_ORIGIN`
(`http://localhost:5173`). Origin не выводится из запроса автоматически. В production
разрешён только точный HTTPS-origin `MINI_APP_ORIGIN`; `Access-Control-Allow-Origin: *`
не используется ни в одном окружении.

## GitHub Pages

Проект должен быть самостоятельным GitHub-репозиторием, а ветка публикации — `main`.

1. В GitHub откройте **Settings → Pages → Build and deployment** и выберите
   **GitHub Actions**.
2. В **Settings → Secrets and variables → Actions → Variables** добавьте
   `VITE_WORKER_URL`, например `https://rpd-bot.example.workers.dev/`.
3. При необходимости добавьте `VITE_BASE_PATH`. Для Project Pages это
   `/<repository>/`. Если переменная не задана, workflow автоматически использует
   имя репозитория и получает тот же путь. Для user/organization Pages задайте `/`.
4. Push в `main` запускает `npm ci → generate:catalog → lint → typecheck → test → build`,
   загружает **только** `apps/web/dist/` и публикует Pages.

Итоговые URL для Project Pages:

```text
Mini App: https://<user>.github.io/<repository>/
Catalog:  https://<user>.github.io/<repository>/catalog.json
PDF:      https://<user>.github.io/<repository>/documents/...
```

`VITE_WORKER_URL` является публичной repository variable, не secret. Значения
`BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` никогда не передаются в Pages workflow,
frontend-переменные, исходники или артефакты.

## Cloudflare Worker

Сначала замените placeholders в `[vars]` файла `apps/worker/wrangler.toml`:

- `MINI_APP_URL` — полный URL Mini App с завершающим `/`;
- `MINI_APP_ORIGIN` — точный production origin без path, например
  `https://<user>.github.io`;
- `PUBLIC_CATALOG_URL` — полный публичный URL `catalog.json`;
- `ENVIRONMENT` — `production`.

Не указывайте wildcard для CORS. Если Pages размещены на custom domain, во всех
трёх значениях используйте именно этот домен и точные path.

Авторизуйтесь Wrangler, затем сохраните секреты интерактивно — их значения не
попадут в командную строку или репозиторий:

```bash
npx wrangler login
npx wrangler secret put BOT_TOKEN --config apps/worker/wrangler.toml
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET --config apps/worker/wrangler.toml
npm run deploy:worker
```

`BOT_TOKEN` выдаёт BotFather. `TELEGRAM_WEBHOOK_SECRET` создайте как случайную
непубличную строку и используйте одно и то же значение в Worker secret и при
регистрации webhook. Проверка после deploy:

```bash
curl --fail-with-body https://<worker-host>/health
```

Ожидаемый ответ: `{"status":"ok"}`. Публичные endpoints:

```text
GET  https://<worker-host>/health
POST https://<worker-host>/api/send-document
POST https://<worker-host>/telegram/webhook
```

Клиент отправляет в `/api/send-document` только проверяемые Worker поля
`initData` и `documentId`. URL документа и Telegram user id от клиента не принимаются.

## Регистрация Telegram webhook

После deploy выполните шаблон из `apps/worker/docs/webhook-registration.md` в
Bash-совместимой консоли. Он интерактивно читает оба секрета и не записывает их в
файл. Webhook URL должен быть строго:

```text
https://<worker-host>/telegram/webhook
```

Запрос `setWebhook` обязан содержать `secret_token` с тем же значением, которое
сохранено как `TELEGRAM_WEBHOOK_SECRET`. Не публикуйте командный вывод и не помещайте
реальные значения в README, `.env`, `wrangler.toml`, GitHub Actions или screenshots.

## BotFather

1. Создайте бота командой `/newbot` и сохраните токен только как Worker secret.
2. Через `/setmenubutton` выберите бота, укажите подпись кнопки и точный HTTPS URL
   `MINI_APP_URL`.
3. При необходимости настройте домен Mini App через `/setdomain`.
4. Откройте чат и отправьте `/start`: бот должен вернуть кнопку Web App. Затем
   проверьте открытие PDF и независимую кнопку «Получить в Telegram».

## Обновление, диагностика и rollback

- **Новый PDF не появился:** проверьте структуру и расширение, локально запустите
  `npm run generate:catalog`, откройте `public/catalog.json`, затем проверьте Pages
  workflow и публичный `/catalog.json`. Worker кэширует доверенный каталог до пяти
  минут, а неизвестный ID принудительно перепроверяет один раз.
- **Mini App открывается без данных:** в DevTools проверьте URL `catalog.json` и
  `VITE_BASE_PATH`. Для Project Pages path должен совпадать с именем репозитория.
- **Ошибка CORS:** `MINI_APP_ORIGIN` должен точно совпадать с browser Origin
  (scheme + host + port, без path). Для localhost используйте только env `dev` и
  явно заданный `DEV_MINI_APP_ORIGIN`; не включайте development в production.
- **Документ не отправляется:** проверьте `/health`, repository variable
  `VITE_WORKER_URL`, Worker secrets, возраст Telegram `initData`, доступность
  публичного PDF и логи Worker без вывода входного `initData` или секретов.
- **Webhook не работает:** повторите `setWebhook` с правильным secret token и
  проверьте `getWebhookInfo`, не публикуя URL с bot token.

Для rollback frontend откройте последний успешный запуск **Actions → Deploy GitHub
Pages** и повторно запустите его для нужного commit либо сделайте обычный revert и
push в `main`. Для Worker checkout нужного commit, ещё раз проверьте публичные vars
и выполните `npm run deploy:worker`. PDF и `catalog.json` всегда откатываются вместе.
Реальные секреты при rollback менять не требуется, если они не были скомпрометированы.

## Границы проекта

Приложение mobile-only (320–430 px), использует HashRouter и не имеет регистрации,
аккаунтов, статистики или базы данных. Избранное и недавние документы хранятся
только в localStorage браузера/Telegram WebView.
