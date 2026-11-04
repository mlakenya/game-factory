import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@engine': fileURLToPath(new URL('./engine', import.meta.url)) } },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
