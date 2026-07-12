import {  getAssetDb } from "@/src/lib/db/asset-client";
import { aya, sora, ayahBbox } from "../database/quranAssetSchema";
import { eq, and, sql, asc } from "drizzle-orm";
import { AyahBbox, PageData, Surah } from "../type";
import { ISurah } from "@/src/types";
import { SQLiteDatabase } from "expo-sqlite";

export async function getJuz(db:SQLiteDatabase) {
    const assetDb = getAssetDb(db);
  try {
    const rows = await assetDb.select({
      juzNumber: aya.joza,
      number: sora.soraid,
      name: sora.name,
      englishName: sora.nameEnglish,
      revelationType: sql<string>`CASE WHEN ${sora.place} = 1 THEN 'Meccan' ELSE 'Medinan' END`,
      startingPage: sql<number>`MIN(${aya.page})`,
      endingPage: sql<number>`MAX(${aya.page})`,
      numberOfAyahs: sql<number>`COUNT(${aya.ayaid})`,
    })
    .from(aya)
    .innerJoin(sora, eq(sora.soraid, aya.soraid))
    .where(sql`${aya.ayaid} > 0`)
    .groupBy(aya.joza, sora.soraid)
    .orderBy(asc(aya.joza), asc(aya.page), asc(sora.soraid));

    const result: { juzNumber: number; surahs: Surah[] }[] = [];

    for (const row of rows as any) {
      const currentJuz = result[result.length - 1];
      const surah: Surah = {
        number: row.number,
        name: row.name,
        englishName: row.englishName,
        numberOfAyahs: row.numberOfAyahs ?? 0,
        revelationType: row.revelationType,
        startingPage: row.startingPage ?? 0,
        endingPage: row.endingPage ?? 0,
      };

      if (!currentJuz || currentJuz.juzNumber !== row.juzNumber) {
        result.push({ juzNumber: row.juzNumber, surahs: [surah] });
        continue;
      }
      currentJuz.surahs.push(surah);
    }
    return result;
  } catch (err) {
    console.error("[AssetService] getJuz error:", err);
    return null;
  }
}

export async function getPageData(page: number, db:SQLiteDatabase): Promise<PageData | null> {
  const assetDb = getAssetDb(db);

  try {
    const rows = await assetDb
      .select({
        soraid: aya.soraid,
        joza: aya.joza,
        hezb: aya.hezb,
        quarter: aya.quarter,
        page: aya.page,
        nameEnglish: sora.nameEnglish,
      })
      .from(aya)
      .innerJoin(sora, eq(sora.soraid, aya.soraid))
      .where(eq(aya.page, page))
      .orderBy(asc(aya.soraid), asc(aya.ayaid))
      .limit(1);

    const result = rows[0];
    if (!result) return null;

    return {
      number: result.soraid,
      name: result.nameEnglish ?? "",
      juz: result.joza ?? 0,
      hizb: result.hezb ?? 0,
      quartor: result.quarter ?? 0,
      page: result.page ?? 0,
    };
  } catch (err) {
    console.error("[AssetService] getPageData error:", err);
    return null;
  }
}


export async function getChaptersForPage(page: number, db: SQLiteDatabase): Promise<number[]> {
  const assetDb = getAssetDb(db);
  try {
    const rows = await assetDb
      .selectDistinct({ soraid: aya.soraid })
      .from(aya)
      .where(eq(aya.page, page))
      .orderBy(asc(aya.soraid));
    return rows.map((r) => r.soraid!).filter(Boolean);
  } catch (err) {
    console.error("[AssetService] getChaptersForPage error:", err);
    return [];
  }
}

export async function getAyahPage(sura: number, ayahId: number, db: SQLiteDatabase) {
  const assetDb = getAssetDb(db);
  try {
    const rows = await assetDb
      .select({ page: aya.page })
      .from(aya)
      .where(and(eq(aya.soraid, sura), eq(aya.ayaid, ayahId)))
      .limit(1);
    return rows[0]?.page ?? null;
  } catch (err) {
    console.error("[AssetService] getAyahPage error:", err);
    return null;
  }
}

export async function getAyahBBoxesByPage(page: number, db: SQLiteDatabase): Promise<AyahBbox[]> {
  const assetDb = getAssetDb(db);
  try {
    const rows = await assetDb
      .select()
      .from(ayahBbox)
      .where(eq(ayahBbox.page, page));
    return rows.map(r => ({
      sura: r.sura!,
      ayah: r.ayah!,
      min_x: r.minX!,
      max_x: r.maxX!,
      min_y: r.minY!,
      max_y: r.maxY!,
      page: r.page!
    }));
  } catch (err) {
    console.error("[AssetService] getAyahBBoxesByPage error:", err);
    return [];
  }
}

export async function getSurah(db: SQLiteDatabase): Promise<ISurah[] | null> {
   const assetDb = getAssetDb(db);
  try {
    const result = await assetDb.select({
      number: sora.soraid,
      name: sora.name,
      englishName: sora.nameEnglish,
      revelationType: sql<string>`CASE WHEN ${sora.place} = 1 THEN 'Meccan' ELSE 'Medinan' END`,
      startingPage: sql<number>`MIN(${aya.page})`,
      endingPage: sql<number>`MAX(${aya.page})`,
      numberOfAyahs: sql<number>`COUNT(${aya.ayaid})`
    })
    .from(sora)
    .innerJoin(aya, eq(aya.soraid, sora.soraid))
    .where(sql`${aya.ayaid} > 0`)
    .groupBy(sora.soraid)
    .orderBy(asc(sora.soraid));

    return result as any as ISurah[];
  } catch (err) {
    console.error("[AssetService] getSurah error:", err);
    return null;
  }
}
