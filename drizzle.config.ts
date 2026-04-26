import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/features/**/database/*Schema.ts',
  dialect: 'sqlite',
  driver: 'expo',
});
