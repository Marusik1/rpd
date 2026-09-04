export interface Env {
  BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  MINI_APP_URL: string;
  MINI_APP_ORIGIN: string;
  PUBLIC_CATALOG_URL: string;
  ENVIRONMENT?: 'production' | 'development';
  DEV_MINI_APP_ORIGIN?: string;
}

export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === 'development';
}
