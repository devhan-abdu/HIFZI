import { db } from '@/src/lib/db/asset-client';
import { sql } from 'drizzle-orm';
import { AyahBbox, PageData, Surah } from "@/src/features/quran/type";
import { ISurah } from "@/src/types";

export const quranService = {
  async getJuz() {
    try {
      const allRows = await db.all<{
        juzNumber: number;
        number: number;
        name: string;
        englishName: string;
        numberOfAyahs: number;
        revelationType: 'Meccan' | 'Medinan';
        startingPage: number;
        endingPage: number;
      }>(sql`
        WITH surah_summary AS (
          SELECT
            soraid,
            COUNT(CASE WHEN ayaid > 0 THEN 1 END) as numberOfAyahs,
            MIN(page) as startingPage,
            MAX(page) as endingPage
          FROM aya
          GROUP BY soraid
        ),
        juz_surahs AS (
          SELECT
            joza as juzNumber,
            soraid
          FROM aya
          WHERE ayaid > 0
          GROUP BY joza, soraid
        )
        SELECT
          j.juzNumber,
          s.soraid as number,
          s.name,
          s.name_english as englishName,
          ss.numberOfAyahs,
          CASE
            WHEN s.place = 1 THEN 'Meccan'
            ELSE 'Medinan'
          END as revelationType,
          ss.startingPage,
          ss.endingPage
        FROM juz_surahs j
        JOIN sora s ON s.soraid = j.soraid
        JOIN surah_summary ss ON ss.soraid = s.soraid
        ORDER BY j.juzNumber ASC, ss.startingPage ASC, s.soraid ASC
      `);

      const result: Array<{ juzNumber: number; surahs: Surah[] }> = [];

      for (const row of allRows) {
        const currentJuz = result[result.length - 1];

        const surah: Surah = {
          number: row.number,
          name: row.name,
          englishName: row.englishName,
          numberOfAyahs: row.numberOfAyahs,
          revelationType: row.revelationType,
          startingPage: row.startingPage,
          endingPage: row.endingPage,
        };

        if (!currentJuz || currentJuz.juzNumber !== row.juzNumber) {
          result.push({
            juzNumber: row.juzNumber,
            surahs: [surah],
          });
          continue;
        }

        currentJuz.surahs.push(surah);
      }

      return result;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  async getPageData(page: number) {
    try {
      const results = await db.all<PageData>(sql`
        SELECT 
          s.soraid as number,
          s.name_english as name,
          a.joza as juz,
          a.hezb as hizb,
          a.quarter as quarter,
          a.page as page
        FROM aya a
        JOIN sora s ON s.soraid = a.soraid
        WHERE a.page = ${page}
        ORDER BY a.soraid ASC, a.ayaid ASC
        LIMIT 1
      `);

      return results[0] || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  async getAyahPage(sura: number, ayah: number) {
    try {
      const result = await db.all<{ page: number }>(sql`
        SELECT page
        FROM aya
        WHERE soraid = ${sura} AND ayaid = ${ayah}
        LIMIT 1
      `);

      return result[0]?.page ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  async getAyahBBoxesByPage(page: number) {
    try {
      const results = await db.query.ayahBbox.findMany({
        where: (table, { eq }) => eq(table.page, page),
      });

      return results.map(r => ({
        sura: r.sura,
        ayah: r.ayah,
        min_x: r.minX,
        max_x: r.maxX,
        min_y: r.minY,
        max_y: r.maxY,
        page: r.page,
      })) as AyahBbox[];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getSurahs() {
    try {
      const results = await db.all<ISurah>(sql`
        WITH surah_summary AS (
          SELECT
            soraid,
            COUNT(CASE WHEN ayaid > 0 THEN 1 END) as numberOfAyahs,
            MIN(page) as startingPage,
            MAX(page) as endingPage
          FROM aya
          GROUP BY soraid
        )
        SELECT
          s.soraid as number,
          s.name,
          s.name_english as englishName,
          ss.numberOfAyahs,
          CASE
            WHEN s.place = 1 THEN 'Meccan'
            ELSE 'Medinan'
          END as revelationType,
          ss.startingPage,
          ss.endingPage
        FROM sora s
        JOIN surah_summary ss ON ss.soraid = s.soraid
        ORDER BY s.soraid
      `);

      return results;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
};
