import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { expoDb, db } from './local-client'; 

export type MigrationResult =
  | { status: 'ok' }
  | { status: 'error'; error: unknown; recovered: boolean };

export async function runMigrationsSafe(): Promise<MigrationResult> {
  try {
    await migrate(db, migrations);
    return { status: 'ok' };
  } catch {
    try {
      expoDb.execSync(`DROP TABLE IF EXISTS __drizzle_migrations;`);
      await migrate(db, migrations);
      return { status: 'ok' };
    } catch (secondError) {
      console.error('[DB] Migration failed even after recovery:', secondError);
      return { status: 'error', error: secondError, recovered: false };
    }
  }
}