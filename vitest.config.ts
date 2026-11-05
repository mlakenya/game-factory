import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@engine': fileURLToPath(new URL('./engine', import.meta.url)) } },
  define: { 'import.meta.env.GF_TARGET': JSON.stringify('yandex') },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
