// ABOUTME: Vitest config for integration tests that hit the real deployed worker.
// ABOUTME: Run with `yarn test:integration`.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
  },
});
