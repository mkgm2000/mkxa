import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    // Stale git worktrees under .claude/worktrees/ carry their own copies of
    // the test suite; without this vitest globs all of them (600+ extra files,
    // slow setup, phantom failures). Only run the live repo's tests.
    exclude: [...configDefaults.exclude, '.claude/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
