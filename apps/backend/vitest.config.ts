import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Parse a .env file into a key/value record.
 * Lines starting with '#' and blank lines are ignored.
 * Values are not unquoted — they are taken as-is after the first '='.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!existsSync(filePath)) return result;
  try {
    const contents = readFileSync(filePath, 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) result[key] = value;
    }
  } catch (err) {
    console.warn(`vitest: could not parse ${filePath}:`, err);
  }
  return result;
}

// Load root .env first, then let .env.test override specific values.
// .env.test lives next to this config file (apps/backend/) and overrides
// Docker-specific values (DB_HOST=postgres, DB_PORT=5432) with host-reachable
// equivalents (DB_HOST=localhost, DB_PORT=5433).
const rootEnv = parseEnvFile(path.resolve(__dirname, '../../.env'));
const testEnv = parseEnvFile(path.resolve(__dirname, '.env.test'));

const envConfig: Record<string, string> = { ...rootEnv, ...testEnv };

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
