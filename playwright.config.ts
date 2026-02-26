import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'npx vite --port 5178',
    port: 5178,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5178',
  },
});
