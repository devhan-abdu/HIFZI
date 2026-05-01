import { drizzle } from 'drizzle-orm/expo-sqlite';
import {  SQLiteDatabase } from 'expo-sqlite';
import * as schema from './asset-schema';



export const getAssetDb = (expo: SQLiteDatabase) => {

    return drizzle(expo, { schema });
};