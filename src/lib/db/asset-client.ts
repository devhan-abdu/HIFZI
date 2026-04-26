import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { QURAN_CORE_DB_NAME } from './constants';
import * as schema from './asset-schema';

const expoDb = openDatabaseSync(QURAN_CORE_DB_NAME);

export const db = drizzle(expoDb, { schema });
