import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register': new URL('./src/test-support/pwa-register-mock.ts', import.meta.url).pathname
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
