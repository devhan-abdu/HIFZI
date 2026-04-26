import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { QURAN_STATE_DB_NAME } from './constants';
import * as schema from './schema';

const expoDb = openDatabaseSync(QURAN_STATE_DB_NAME);

export const db = drizzle(expoDb, { schema });
