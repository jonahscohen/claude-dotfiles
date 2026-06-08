import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@plugin': path.resolve(__dirname, 'src/plugin'),
    },
  },
});
