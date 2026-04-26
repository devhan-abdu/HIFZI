import { db as assetDb } from "@/src/lib/db/asset-client";
import { aya, sora, ayahBbox } from "../database/quranAssetSchema";
import { eq, and, sql, asc } from "drizzle-orm";
import { AyahBbox, PageData, Surah } from "../type";
import { ISurah } from "@/src/types";

export async function getJuz() {
  try {
    const rows = await assetDb.select({
      juzNumber: aya.joza,
      number: sora.soraid,
      name: sora.name,
      englishName: sora.nameEnglish,
      revelationType: sql<string>`CASE WHEN ${sora.place} = 1 THEN 'Meccan' ELSE 'Medinan' END`,
    })
    .from(aya)
    .innerJoin(sora, eq(sora.soraid, aya.soraid))
    .where(sql`${aya.ayaid} > 0`)
    .groupBy(aya.joza, sora.soraid)
    .orderBy(asc(aya.joza), asc(aya.page), asc(sora.soraid));

    const result: Array<{ juzNumber: number; surahs: Surah[] }> = [];

    for (const row of rows as any) {
      const currentJuz = result[result.length - 1];
      const surah: Surah = {
        number: row.number,
        name: row.name,
        englishName: row.englishName,
        numberOfAyahs: 0, 
        revelationType: row.revelationType,
        startingPage: 0,
        endingPage: 0,
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

export async function getPageData(page: number): Promise<PageData | null> {
  try {
    const result = await assetDb.query.aya.findFirst({
      where: eq(aya.page, page),
      with: { sora: true },
      orderBy: [asc(aya.soraid), asc(aya.ayaid)]
    });

    if (!result) return null;

    return {
      number: result.soraid,
      name: (result as any).sora?.nameEnglish || "",
      juz: result.joza ?? 0,
      hizb: result.hezb ?? 0,
      quartor: result.quarter ?? 0,
      page: result.page ?? 0
    };
  } catch (err) {
    console.error("[AssetService] getPageData error:", err);
    return null;
  }
}

export async function getAyahPage(sura: number, ayahId: number) {
  try {
    const result = await assetDb.query.aya.findFirst({
      where: and(eq(aya.soraid, sura), eq(aya.ayaid, ayahId)),
      columns: { page: true }
    });
    return result?.page ?? null;
  } catch (err) {
    console.error("[AssetService] getAyahPage error:", err);
    return null;
  }
}

export async function getAyahBBoxesByPage(page: number): Promise<AyahBbox[]> {
  try {
    const rows = await assetDb.query.ayahBbox.findMany({
      where: eq(ayahBbox.page, page)
    });
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

export async function getSurah(): Promise<ISurah[] | null> {
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
