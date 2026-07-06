import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callQF, QF_ENV } from "./qfClient";

export type Reciter = {
  id: number;
  name: string;
  slug?: string;
};

export type ChapterAudioSegment = {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
};

export type ChapterAudioResponse = {
  audio_file?: {
    audio_url?: string;
    timestamps?: ChapterAudioSegment[];
    segments?: ChapterAudioSegment[];
  };
  audio_url?: string;
  url?: string;
  segments?: ChapterAudioSegment[];
};


export async function getRecitationsCached(): Promise<Reciter[]> {
  const CACHE_KEY = "chapter_reciters_v6";
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const response = await callQF(`/${QF_ENV}/content/api/v4/resources/chapter_reciters`, {
      params: { language: "en" },
    });

    const raw: any[] = response?.reciters ?? [];
    
    const recitations: Reciter[] = raw
      .map((item: any) => ({
        id: Number(item?.id),
        slug: item?.slug,
        name:
          item?.reciter_name ??
          item?.translated_name?.name ??
          item?.name ??
          `Reciter ${item?.id}`,
      }))
      .filter((r: Reciter) => r.id > 0 && r.name);

    if (recitations.length > 0) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recitations));
    }
    return recitations;
  } catch (error) {
    console.error("[AudioService] getRecitations error:", error);
    return [];
  }
}

export function normalizeSegments(segments: ChapterAudioSegment[]) {
  if (segments.length === 0) return segments;

  const maxTimestampTo = Math.max(...segments.map((segment) => segment.timestamp_to));
  if (maxTimestampTo > 20000) return segments;

  return segments.map((segment) => ({
    ...segment,
    timestamp_from: segment.timestamp_from * 1000,
    timestamp_to: segment.timestamp_to * 1000,
  }));
}


export async function fetchChapterAudioMetadata(
  chapterId: number,
  reciterId: number,
): Promise<ChapterAudioResponse> {
  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
    throw new Error(`INVALID_CHAPTER_NUMBER: ${chapterId}. Expected integer 1–114.`);
  }
  if (!Number.isInteger(reciterId) || reciterId < 1) {
    throw new Error(`INVALID_RECITER_ID: ${reciterId}. Expected a positive integer.`);
  }

  const endpoint = `/${QF_ENV}/content/api/v4/chapter_recitations/${Number(String(reciterId))}/${String(chapterId)}`;
  return (await callQF(endpoint, {
    params: { segments: true },
  })) as ChapterAudioResponse;
}

export async function downloadAudioFileWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  const response = await expoFetch(url);
  if (!response.ok) throw new Error(`AUDIO_DOWNLOAD_FAILED_${response.status}`);
  if (!response.body) throw new Error("AUDIO_DOWNLOAD_BODY_MISSING");

  file.create({ intermediates: true, overwrite: true });
  const reader = response.body.getReader();
  const writer = file.writableStream().getWriter();
  const totalBytes = Number(response.headers.get("content-length") ?? 0);
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      downloadedBytes += value.byteLength;
      await writer.write(value);
      if (totalBytes > 0) onProgress(downloadedBytes / totalBytes);
    }
    await writer.close();
    onProgress(1);
  } catch (error) {
    try { await writer.abort(error); } catch {}
    if (file.exists) file.delete();
    throw error;
  } finally {
    reader.releaseLock?.();
  }
}
