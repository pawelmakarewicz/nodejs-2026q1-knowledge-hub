import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/unit/setup.ts'],
    include: ['src/**/*.unit.spec.ts'],
    exclude: ['test/**', 'dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/**/*.service.ts',
        'src/**/*.guard.ts',
        'src/**/*.pipe.ts',
        'src/**/*.interceptor.ts',
      ],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/entities/**',
        'src/prisma/**',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
