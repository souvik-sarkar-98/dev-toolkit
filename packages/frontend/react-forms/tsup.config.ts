import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    unstyled: 'src/unstyled.tsx',
    'bootstrap/index': 'src/bootstrap/index.ts',
    'zod/index': 'src/zod/index.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'react-hook-form', 'zod'],
  tsconfig: 'tsconfig.json',
});
