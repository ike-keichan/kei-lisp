import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'html', 'lcov'],
      // Floors slightly below the measured values (2026-07: 84.2 / 76.8 /
      // 91.3 / 84.1) so regressions fail CI without making every small
      // refactor fight the last percent.
      thresholds: {
        statements: 83,
        branches: 75,
        functions: 90,
        lines: 83,
      },
    },
  },
});
