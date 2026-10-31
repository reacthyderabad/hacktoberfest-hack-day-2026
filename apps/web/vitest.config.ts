import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Only covers the pure logic under `lib/`: nothing here needs a DOM, and `@/`
 * is resolved by hand because Next owns the tsconfig path mapping.
 *
 * vitest is resolved from the hoisted root install, so no dependency is
 * declared in this package's package.json.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
