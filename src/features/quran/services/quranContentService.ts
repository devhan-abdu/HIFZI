import { Directory, File, Paths } from "expo-file-system";
import { callQF } from "./qfClient";
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
};

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

function extractTextPayload(response: any, key: "tafsirs" | "translations"): any | null {
  const data = response?.[key]?.[0] ?? response?.data?.[key]?.[0] ?? response?.[key] ?? response?.data?.[key];
  if (!data || typeof data !== "object") return null;

  return {
    text: data.text ?? data.tafsir ?? data.body ?? data.content ?? "",
    languageName: data.language_name ?? data.languageName,
    resourceName: data.resource_name ?? data.resourceName ?? data.name,
  };
}

export async function getTranslationsCached(): Promise<Translation[]> {
  try {
    const cached = await AsyncStorage.getItem("translations");
    if (cached) return JSON.parse(cached);

    const response = await callQF("/content/resources/translations", { params: { language: "en" } });
    const translations = response?.translations ?? [];
    if (translations.length > 0) {
      await AsyncStorage.setItem("translations", JSON.stringify(translations));
    }
    return translations;
  } catch (error) {
    console.error("[ContentService] getTranslations error:", error);
    return [];
  }
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

  const response = await callQF(`/content/tafsirs/${tafsirId}/by_ayah/${verseKey}`, {
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

  const response = await callQF(`/content/translations/${translationId}/by_ayah/${verseKey}`, {
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

export async function getPageVersesWithTranslation(page: number, translationId: number): Promise<PageVerse[]> {
  const cacheDir = new Directory(Paths.document, "page_translations", String(translationId));
  const cacheFile = new File(cacheDir, `page_${page}.json`);

  if (cacheFile.exists) {
    try {
      return JSON.parse(cacheFile.textSync());
    } catch {}
  }

  const response = await callQF(`/content/translations/${translationId}/by_page/${page}`, {
    params: { fields: "text_uthmani,verse_key,verse_number" }
  });

  const verses = response?.translations ?? response?.data ?? [];
  if (verses.length > 0) {
    if (!cacheDir.exists) cacheDir.create({ idempotent: true, intermediates: true });
    cacheFile.write(JSON.stringify(verses));
  }
  return verses;
}
