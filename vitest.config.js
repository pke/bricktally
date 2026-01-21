import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Global test setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        'node_modules/**',
        '**/*.spec.js',
        '**/*.test.js'
      ]
    },

    // Test file patterns
    include: ['tests/unit/**/*.{test,spec}.js'],

    // Setup files
    // setupFiles: ['./tests/setup.js'],
  }
});
