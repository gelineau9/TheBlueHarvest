import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';

// Parse .env file manually
const envPath = path.resolve(__dirname, '../../.env');
const envConfig: Record<string, string> = {};

try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...values] = trimmedLine.split('=');
      if (key) {
        envConfig[key.trim()] = values.join('=').trim();
      }
    }
  });
} catch (error) {
  console.warn('Could not load .env file:', error);
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: envConfig,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.config.*', '**/dist/**'],
    },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
