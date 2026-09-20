import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
  },
});
