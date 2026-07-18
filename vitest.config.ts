import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests run in Node (pure functions). Component tests opt into jsdom via a
// `// @vitest-environment jsdom` docblock. E2E lives in Playwright, not here.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
    environment: 'node',
    // jsdom (used by component tests and storage-backed unit tests via docblock)
    // needs a real origin or localStorage is a non-functional opaque-origin stub.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      // Scope to genuinely unit-testable modules — the width-aware grid engine
      // (parse/detect/print/ops) is the core of this tool and is exhaustively
      // unit tested. DOM-integration bits (SW registration) are covered by the
      // Playwright e2e suite instead.
      include: [
        'src/utils/settings.ts',
        'src/utils/settingsStorage.ts',
        'src/lib/width.ts',
        'src/lib/boxChars.ts',
        'src/lib/grid.ts',
        'src/lib/parse.ts',
        'src/lib/print.ts',
        'src/lib/detect.ts',
        'src/lib/ops.ts',
        'src/lib/aiCopy.ts',
      ],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
