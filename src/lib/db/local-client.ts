import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { QURAN_STATE_DB_NAME } from './constants';
import * as schema from './schema';

let cachedDbInstance: ExpoSQLiteDatabase<typeof schema> | null = null;

export const getStateDb = (): ExpoSQLiteDatabase<typeof schema> => {
  if (cachedDbInstance) {
    return cachedDbInstance;
  }

  const expoDb = openDatabaseSync(QURAN_STATE_DB_NAME);
  cachedDbInstance = drizzle(expoDb, { schema });
  
  return cachedDbInstance;
};
