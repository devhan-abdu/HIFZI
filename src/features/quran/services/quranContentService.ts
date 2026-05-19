import { Directory, File, Paths } from "expo-file-system";
import { callQF, QF_ENV } from "./qfClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export type Translation = {
  id: number;
  name: string;
  language_name?: string;
};

export type PageVerse = {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translations?: {
    id: number;
    resource_id: number;
    text: string;
  }[];
};

function extractTextPayload(response: any, key: "tafsirs" | "translations"): any | null {
  const data = response?.[key]?.[0] ?? response?.data?.[key]?.[0] ?? response?.[key] ?? response?.data?.[key];
  if (!data || typeof data !== "object") return null;

  return {
    text: data.text ?? data.tafsir ?? data.body ?? data.content ?? "",
    languageName: data.language_name ?? data.languageName,
    resourceName: data.resource_name ?? data.resourceName ?? data.name,
  };
}

let _translationsCache: Translation[] | null = null;
let _translationsFetch: Promise<Translation[]> | null = null;

export async function getTranslationsCached(): Promise<Translation[]> {
  if (_translationsCache) return _translationsCache;
  if (_translationsFetch) return _translationsFetch;

  _translationsFetch = (async () => {
    try {
      const cached = await AsyncStorage.getItem("translations_v2");
      if (cached) {
        _translationsCache = JSON.parse(cached);
        return _translationsCache!;
      }

      const response = await callQF(`/${QF_ENV}/content/api/v4/resources/translations`, { params: { language: "en" } });
      const raw: any[] = response?.translations ?? [];
      const translations: Translation[] = raw
        .map((item: any) => ({
          id: Number(item?.id),
          name:
            item?.translated_name?.name ??
            item?.name ??
            item?.author_name ??
            `Translation ${item?.id}`,
          language_name: item?.language_name ?? item?.language?.name ?? "",
        }))
        .filter((t) => t.id > 0 && t.name);

      if (translations.length > 0) {
        await AsyncStorage.setItem("translations_v2", JSON.stringify(translations));
        _translationsCache = translations;
      }
      return translations;
    } catch (error) {
      return [];
    } finally {
      _translationsFetch = null;
    }
  })();

  return _translationsFetch;
}

export function warmTranslationsCache() {
  void getTranslationsCached();
}

export async function getAyahTafsirCached(tafsirId: number, sura: number, ayah: number): Promise<TafsirPayload> {
  const verseKey = `${sura}:${ayah}`;
  const cacheDir = new Directory(Paths.document, "tafsirs", String(tafsirId));
  const cacheFile = new File(cacheDir, `${sura}_${ayah}.json`);

  if (cacheFile.exists) {
    try {
      return JSON.parse(cacheFile.textSync());
    } catch {}
  }

  const response = await callQF(`/${QF_ENV}/content/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`, {
    params: { fields: "resource_name,language_name,verse_key" }
  });

  const payload = extractTextPayload(response, "tafsirs");
  if (payload) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(payload));
    return payload;
  }
  throw new Error("TAFSIR_NOT_FOUND");
}

export async function getAyahTranslationCached(translationId: number, sura: number, ayah: number): Promise<TranslationPayload> {
  const verseKey = `${sura}:${ayah}`;
  const cacheDir = new Directory(Paths.document, "translations", String(translationId));
  const cacheFile = new File(cacheDir, `${sura}_${ayah}.json`);

  if (cacheFile.exists) {
    try {
      return JSON.parse(cacheFile.textSync());
    } catch {}
  }

  const response = await callQF(`/${QF_ENV}/content/api/v4/translations/${translationId}/by_ayah/${verseKey}`, {
    params: { fields: "resource_name,language_name,verse_key" }
  });

  const payload = extractTextPayload(response, "translations");
  if (payload) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(payload));
    return payload;
  }
  throw new Error("TRANSLATION_NOT_FOUND");
}

/**
 * Fetch all verses for a chapter with translation text.
 * Uses the user's recommended endpoint: GET /translations/{resource_id}/by_chapter/{chapter_number}
 */
export async function getChapterVersesWithTranslation(
  chapterId: number,
  translationId: number,
): Promise<PageVerse[]> {
  if (chapterId < 1 || chapterId > 114) {
    throw new Error(`INVALID_CHAPTER_NUMBER: ${chapterId}. Must be 1–114.`);
  }

  const cacheDir = new Directory(Paths.document, "chapter_translations", String(translationId));
  const cacheFile = new File(cacheDir, `chapter_${chapterId}.json`);

  if (cacheFile.exists) {
    try {
      return JSON.parse(cacheFile.textSync());
    } catch {}
  }

  const response = await callQF(
    `/${QF_ENV}/content/api/v4/translations/${translationId}/by_chapter/${chapterId}`,
    { params: { fields: "text_uthmani,verse_key,verse_number" } },
  );

  const raw: any[] = response?.translations ?? response?.data ?? [];
  const verses: PageVerse[] = raw.map((v: any) => ({
    id: v.id ?? v.resource_id ?? 0,
    verse_key: v.verse_key ?? "",
    text_uthmani: v.text_uthmani ?? "",
    translations: [
      {
        id: v.id ?? 0,
        resource_id: v.resource_id ?? translationId,
        text: v.text ?? "",
      },
    ],
  }));

  if (verses.length > 0) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(verses));
  }
  return verses;
}

/** @deprecated Use getChapterVersesWithTranslation instead */
export async function getPageVersesWithTranslation(page: number, translationId: number): Promise<PageVerse[]> {
  const cacheDir = new Directory(Paths.document, "page_translations", String(translationId));
  const cacheFile = new File(cacheDir, `page_${page}.json`);

  if (cacheFile.exists) {
    try {
      return JSON.parse(cacheFile.textSync());
    } catch {}
  }

  const response = await callQF(`/${QF_ENV}/content/api/v4/translations/${translationId}/by_page/${page}`, {
    params: { fields: "text_uthmani,verse_key,verse_number" }
  });

  const verses = response?.translations ?? response?.data ?? [];
  if (verses.length > 0) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(verses));
  }
  return verses;
}
