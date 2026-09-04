import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build --workspace @rpd/web && npm exec vite preview --workspace @rpd/web -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    env: { VITE_WORKER_URL: 'https://worker.example.test/' },
  },
});
