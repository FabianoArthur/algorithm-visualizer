import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base: the build works on GitHub Pages under any repository name.
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
