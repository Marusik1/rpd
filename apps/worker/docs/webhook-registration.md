# Telegram webhook registration

Deploy the Worker, then set its webhook without writing secret values to a file or command history:

```bash
read -rsp "Bot token: " BOT_TOKEN && echo
read -rsp "Webhook secret: " TELEGRAM_WEBHOOK_SECRET && echo
read -rp "Worker URL (https://…): " WORKER_URL
curl --fail-with-body --request POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${WORKER_URL%/}/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
unset BOT_TOKEN TELEGRAM_WEBHOOK_SECRET
```

Use the same secret value stored with `wrangler secret put TELEGRAM_WEBHOOK_SECRET`. Do not put either secret in `wrangler.toml`, application variables, source files, logs, or screenshots.
