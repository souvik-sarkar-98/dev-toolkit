import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  resolve: {
    alias: {
      '@ssdev-toolkit/forms-core': path.join(dir, 'forms-core/src/index.ts'),
      '@ssdev-toolkit/comment-core': path.join(dir, 'comment-core/src/index.ts'),
      '@ssdev-toolkit/list-dashboard-core': path.join(
        dir,
        'list-dashboard-core/src/index.ts',
      ),
      '@ssdev-toolkit/auth-core': path.join(dir, 'auth-core/src/index.ts'),
    },
  },
  test: {
    include: ['*/src/**/*.spec.ts'],
  },
});
