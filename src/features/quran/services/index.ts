import { SQLiteDatabase } from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import { AyahBbox, PageData, Surah } from "../type";
import { ISurah } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;


export async function getJuz(db: SQLiteDatabase) {
  try {
    const rows = await db.getAllAsync<
      Surah & {
        juzNumber: number;
      }
    >(
      `WITH surah_summary AS (
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
      ORDER BY j.juzNumber ASC, ss.startingPage ASC, s.soraid ASC`
    );

    const result: Array<{ juzNumber: number; surahs: Surah[] }> = [];

    for (const row of rows) {
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
}

export async function getPageData(db: SQLiteDatabase, page: number) {
  try {
    const result = await db.getFirstAsync<PageData>(
      `SELECT 
        s.soraid as number,
        s.name_english as name,
        a.joza as juz,
        a.hezb as hizb,
        a.quarter as quarter,
        a.page as page
      FROM aya a
      JOIN sora s ON s.soraid = a.soraid
      WHERE a.page = ?
      ORDER BY a.soraid ASC, a.ayaid ASC
      LIMIT 1`,
      [page]
    );

    return result;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getAyahPage(
  db: SQLiteDatabase,
  sura: number,
  ayah: number,
) {
  try {
    const result = await db.getFirstAsync<{ page: number }>(
      `SELECT page
      FROM aya
      WHERE soraid = ? AND ayaid = ?
      LIMIT 1`,
      [sura, ayah],
    );

    return result?.page ?? null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

const ayahBBoxesByPageCache = new Map<number, AyahBbox[]>();

export async function getAyahBBoxesByPage(
  db: SQLiteDatabase,
  page: number,
) {
  const cached = ayahBBoxesByPageCache.get(page);
  if (cached) {
    return cached;
  }

  try {
    const result = await db.getAllAsync<AyahBbox>(
      `SELECT sura, ayah, min_x, max_x, min_y, max_y, page
      FROM ayah_bbox
      WHERE page = ?`,
      [page],
    );

    ayahBBoxesByPageCache.set(page, result);
    return result;
  } catch (err) {
    console.error(err);
    return [];
  }
}


export async function getSurah(db: SQLiteDatabase) {
  try {
    const result = await db.getAllAsync<ISurah>(
      `WITH surah_summary AS (
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
      ORDER BY s.soraid`
    );

    return result;
  } catch (err) {
    console.error(err);
    return null;
  }
}




const BASE_URL = "https://uungvwtrbfqatqtqbqef.supabase.co/storage/v1/object/quran-pages/";
const activeDownloads = new Map<number, Promise<string | null>>();

export async function getPageImage(page: number): Promise<string | null> {
  const pageFile = new File(Paths.document, `page_${page}.png`)
 
  if (pageFile.exists) {
    return pageFile.uri
  }

    if (activeDownloads.has(page)) {
    return activeDownloads.get(page)!;
    }
  
  const downloadPromise = (async () => {

    try {
    const remoteUrl = `${BASE_URL}${page}.png`;
    await File.downloadFileAsync(remoteUrl, pageFile);
    return pageFile.uri
  } catch (error) {
     console.error("Download failed:", error);
    return null
    } finally {
      activeDownloads.delete(page)
  }
  })()

  activeDownloads.set(page, downloadPromise)  
   return downloadPromise
  

}

export async function prefetchPages(currentPage: number) {
  const nextPages = [currentPage + 1, currentPage + 2];

 for (const p of nextPages) {
    if (p >= 1 && p <= 604) {
      getPageImage(p); 
    }
  }
}


type QFOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  params?: Record<string, any>;
  body?: any;
  silentErrorLog?: boolean;
};

export class QFRequestError extends Error {
  endpoint: string;
  status: number;
  bodyText: string;
  payload: unknown;
  params?: Record<string, any>;

  constructor({
    endpoint,
    status,
    bodyText,
    payload,
    params,
  }: {
    endpoint: string;
    status: number;
    bodyText: string;
    payload: unknown;
    params?: Record<string, any>;
  }) {
    super(bodyText || `QF request failed with status ${status}`);
    this.name = "QFRequestError";
    this.endpoint = endpoint;
    this.status = status;
    this.bodyText = bodyText;
    this.payload = payload;
    this.params = params;
  }
}

function parseQFResponse(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function callQF(endpoint: string, options?: QFOptions) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionToken = session?.access_token;

    if (!sessionToken) throw new Error("AUTH_REQUIRED");

    const res = await fetch(`${BACKEND_BASE_URL}/qf-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        endpoint,
        method: options?.method ?? "GET",
        params: options?.params,
        body: options?.body,
      }),
    });

    const text = await res.text();
    const payload = parseQFResponse(text);

    if (!res.ok) {
      console.error("callQF API error:", {
        endpoint,
        status: res.status,
        params: options?.params,
        body: payload,
      });

      throw new QFRequestError({
        endpoint,
        status: res.status,
        bodyText: text,
        payload,
        params: options?.params,
      });
    }

    return payload;
  } catch (error: any) {
    if (!options?.silentErrorLog) {
      console.error("callQF failure:", {
        endpoint,
        params: options?.params,
        message: error?.message ?? String(error),
      });
    }
    throw error; 
  }
}


export type Reciter = {
  id: number;
  name: string;
};

export type ChapterAudioSegment = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
};

export type ChapterAudioResponse = {
  audio_file?: {
    audio_url?: string;
    segments?: ChapterAudioSegment[];
  };
  audio_url?: string;
  url?: string;
  segments?: ChapterAudioSegment[];
};

export async function getRecitationsCached(): Promise<Reciter[]> {
  const CACHE_KEY = "chapter_reciters_v1";

  const normalizeReciter = (item: any): Reciter | null => {
    const id = Number(item?.id);
    if (!Number.isFinite(id)) {
      return null;
    }

    const name =
      item?.reciter_name ??
      item?.translated_name?.name ??
      item?.style?.name ??
      item?.name ??
      "";

    if (!name || typeof name !== "string") {
      return null;
    }

    return { id, name };
  };

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await callQF("/content/resources/chapter_reciters", {
      params: { language: "en" },
    });

    const recitations = (response?.reciters ?? [])
      .map(normalizeReciter)
      .filter((item: Reciter | null): item is Reciter => item !== null);

    if (recitations.length > 0) {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify(recitations)
      );
    }

    return recitations;
  } catch (error) {
    console.error("Failed to load recitations:", error);
    return [];
  }
}

export type TafsirPayload = {
  text: string;
  languageName?: string;
  resourceName?: string;
};

export type TranslationPayload = {
  text: string;
  languageName?: string;
  resourceName?: string;
};

function extractTextPayload(
  response: any,
  key: "tafsirs" | "translations",
): TafsirPayload | TranslationPayload | null {
  const fromArray = response?.[key]?.[0] ?? response?.data?.[key]?.[0];
  const fromObject = response?.[key] ?? response?.data?.[key];

  const candidate =
    (fromArray && typeof fromArray === "object" ? fromArray : null) ??
    (fromObject && typeof fromObject === "object" ? fromObject : null);

  if (!candidate) {
    return null;
  }

  const text =
    candidate.text ??
    candidate.tafsir ??
    candidate.body ??
    candidate.content ??
    "";

  if (!text || typeof text !== "string") {
    return null;
  }

  return {
    text,
    languageName: candidate.language_name ?? candidate.languageName,
    resourceName:
      candidate.resource_name ?? candidate.resourceName ?? candidate.name,
  };
}

async function fetchAyahTafsirFromApi(
  tafsirId: number,
  verseKey: string,
): Promise<TafsirPayload> {
  const endpoints: Array<{ endpoint: string; params?: Record<string, any> }> = [
    {
      endpoint: `/content/tafsirs/${tafsirId}/by_ayah/${verseKey}`,
      params: {
        fields: "resource_name,language_name,verse_key",
      },
    },
    {
      endpoint: `/content/quran/tafsirs/${tafsirId}`,
      params: {
        chapter_number: Number(verseKey.split(":")[0]),
        fields: "resource_name,language_name,verse_key",
      },
    },
  ];

  for (const item of endpoints) {
    try {
      const response = await callQF(item.endpoint, {
        params: item.params,
        silentErrorLog: true,
      });

      const parsed = extractTextPayload(response, "tafsirs");
      if (parsed) {
        return parsed as TafsirPayload;
      }
    } catch {
      // Try the next endpoint variant.
    }
  }

  throw new Error("TAFSIR_NOT_FOUND");
}

export async function getAyahTafsirCached(
  tafsirId: number,
  sura: number,
  ayah: number,
): Promise<TafsirPayload> {
  const verseKey = `${sura}:${ayah}`;
  const cacheDir = new Directory(Paths.document, "tafsirs", String(tafsirId));
  const cacheFile = new File(cacheDir, `${sura}_${ayah}.json`);

  if (cacheFile.exists) {
    try {
      const cachedPayload = JSON.parse(cacheFile.textSync()) as TafsirPayload;
      if (cachedPayload?.text) {
        return cachedPayload;
      }
    } catch {
      // Ignore malformed cache and refetch.
    }
  }

  if (!cacheDir.exists) {
    cacheDir.create({ idempotent: true, intermediates: true });
  }

  const payload = await fetchAyahTafsirFromApi(tafsirId, verseKey);
  cacheFile.write(JSON.stringify(payload));
  return payload;
}


export type Translation = {
  id: number;
  name: string;
};

export async function getTranslationsCached(): Promise<Translation[]> {
  try {
    const cached = await AsyncStorage.getItem("translations");

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await callQF("/content/resources/translations", {
      params: { language: "en" },
    });

    const translations: Translation[] =
      response?.translations ?? [];

    if (translations.length > 0) {
      await AsyncStorage.setItem(
        "translations",
        JSON.stringify(translations)
      );
    }

    return translations;
  } catch (error) {
    console.error("Failed to load translations:", error);
    return [];
  }
}

async function fetchAyahTranslationFromApi(
  translationId: number,
  verseKey: string,
): Promise<TranslationPayload> {
  const endpoints: Array<{ endpoint: string; params?: Record<string, any> }> = [
    {
      endpoint: `/content/translations/${translationId}/by_ayah/${verseKey}`,
      params: {
        fields: "resource_name,language_name,verse_key",
      },
    },
    {
      endpoint: `/content/quran/translations/${translationId}`,
      params: {
        chapter_number: Number(verseKey.split(":")[0]),
        fields: "resource_name,language_name,verse_key",
      },
    },
  ];

  for (const item of endpoints) {
    try {
      const response = await callQF(item.endpoint, {
        params: item.params,
        silentErrorLog: true,
      });

      const parsed = extractTextPayload(response, "translations");
      if (parsed) {
        return parsed as TranslationPayload;
      }
    } catch {
      // Try fallback endpoint shape.
    }
  }

  throw new Error("TRANSLATION_NOT_FOUND");
}

export async function getAyahTranslationCached(
  translationId: number,
  sura: number,
  ayah: number,
): Promise<TranslationPayload> {
  const verseKey = `${sura}:${ayah}`;
  const cacheDir = new Directory(Paths.document, "translations", String(translationId));
  const cacheFile = new File(cacheDir, `${sura}_${ayah}.json`);

  if (cacheFile.exists) {
    try {
      const cachedPayload = JSON.parse(cacheFile.textSync()) as TranslationPayload;
      if (cachedPayload?.text) {
        return cachedPayload;
      }
    } catch {
      // Ignore malformed cache and refetch.
    }
  }

  if (!cacheDir.exists) {
    cacheDir.create({ idempotent: true, intermediates: true });
  }

  const payload = await fetchAyahTranslationFromApi(translationId, verseKey);
  cacheFile.write(JSON.stringify(payload));
  return payload;
}

export async function getReflectionContextByPage(page: number) {
  const attempts: Array<{ endpoint: string; params?: Record<string, any> }> = [
    {
      endpoint: `/content/verses/by_page/${page}`,
      params: {
        words: false,
        per_page: 3,
      },
    },
    {
      endpoint: "/content/quran/verses/uthmani",
      params: {
        page_number: page,
      },
    },
  ];

  for (const item of attempts) {
    try {
      const response = await callQF(item.endpoint, {
        params: item.params,
        silentErrorLog: true,
      });

      const verses = response?.verses ?? response?.data?.verses ?? [];
      if (Array.isArray(verses) && verses.length > 0) {
        const first = verses[0];
        const chapterName =
          first?.verse_key ?
            `Surah ${String(first.verse_key).split(":")[0]}`
          : "Current page";
        const excerpt = verses
          .slice(0, 2)
          .map((verse: any) => verse?.text_uthmani ?? verse?.text_imlaei ?? "")
          .filter(Boolean)
          .join(" ");

        return {
          title: chapterName,
          excerpt: excerpt || "Reflect on the ayahs you just recited.",
        };
      }
    } catch {
      // Try next endpoint variant.
    }
  }

  return {
    title: "Reflection",
    excerpt: "What touched your heart in this reading session?",
  };
}

export type PageVerse = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translations?: Array<{
    id: number;
    resource_id: number;
    text: string;
  }>;
};


export async function getPageVersesWithTranslation(
  page: number,
  translationId: number
): Promise<PageVerse[]> {
  const cacheDir = new Directory(Paths.document, "page_translations", String(translationId));
  const cacheFile = new File(cacheDir, `page_${page}.json`);

  if (cacheFile.exists) {
    try {
      const cached = JSON.parse(cacheFile.textSync());
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {
      console.warn("Malformed cache for page", page);
    }
  }

 
  const response = await callQF(`/content/translations/${translationId}/by_page/${page}`, {
    params: {
      fields: "text_uthmani,verse_key,verse_number", 
    },
  });

  const verses = response?.translations ?? response?.data ?? [];
  
  if (verses.length > 0) {
    if (!cacheDir.exists) {
      cacheDir.create({ idempotent: true, intermediates: true });
    }
    cacheFile.write(JSON.stringify(verses));
  }

  return verses;
}


export async function getSurahTranslations(
  chapterNumber: number,
  translationId: number
): Promise<PageVerse[]> {
  const cacheDir = new Directory(Paths.document, "surah_translations", String(translationId));
  const cacheFile = new File(cacheDir, `chapter_${chapterNumber}.json`);

  if (cacheFile.exists) {
    try {
      const cached = JSON.parse(cacheFile.textSync());
      return cached;
    } catch (e) {
      console.error("Cache read error", e);
    }
  }

  
  const response = await callQF(`/content/quran/translations/${translationId}`, {
    params: {
      chapter_number: chapterNumber,
      fields: "verse_key,verse_number,chapter_id,id",
    },
  });

  const translations = response?.translations || [];

  if (translations.length > 0) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(translations));
  }

  return translations;
}
