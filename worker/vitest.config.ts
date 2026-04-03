// ABOUTME: Vitest config for the worker package.
// ABOUTME: Separates unit tests (default) from integration tests.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
  },
});
