import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run build && bun run preview --host 127.0.0.1',
    url: 'http://localhost:4321/draw/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'projector-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'projector-1080p', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }
  ]
});
