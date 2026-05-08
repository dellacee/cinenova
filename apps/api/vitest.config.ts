import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', '**/*.module.ts', '**/dto/**', '**/*.spec.ts'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
