import { Audio, AVPlaybackStatus } from "expo-av";
import { fetch as expoFetch } from "expo/fetch";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  callQF,
  ChapterAudioResponse,
  ChapterAudioSegment,
} from "../services";
import { useReaderStore } from "./useReaderStore";

const AUDIO_PROGRESS_INTERVAL_MS = 150;

function parseVerseKey(verseKey: string) {
  const [sura, ayah] = verseKey.split(":").map(Number);

  if (!sura || !ayah) {
    return null;
  }

  return { sura, ayah };
}

async function downloadAudioFileWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  const response = await expoFetch(url);

  if (!response.ok) {
    throw new Error(`AUDIO_DOWNLOAD_FAILED_${response.status}`);
  }

  if (!response.body) {
    throw new Error("AUDIO_DOWNLOAD_BODY_MISSING");
  }

  file.create({ intermediates: true, overwrite: true });

  const reader = response.body.getReader();
  const writer = file.writableStream().getWriter();
  const totalBytes = Number(response.headers.get("content-length") ?? 0);
  let downloadedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      downloadedBytes += value.byteLength;
      await writer.write(value);

      if (totalBytes > 0) {
        onProgress(downloadedBytes / totalBytes);
      }
    }

    await writer.close();
    onProgress(1);
  } catch (error) {
    try {
      await writer.abort(error);
    } catch {}

    try {
      if (file.exists) {
        file.delete();
      }
    } catch {}

    throw error;
  } finally {
    reader.releaseLock?.();
  }
}

function normalizeSegments(segments: ChapterAudioSegment[]) {
  if (segments.length === 0) {
    return segments;
  }

  const maxTimestampTo = Math.max(...segments.map((segment) => segment.timestamp_to));
  if (maxTimestampTo > 20000) {
    return segments;
  }

  return segments.map((segment) => ({
    ...segment,
    timestamp_from: segment.timestamp_from * 1000,
    timestamp_to: segment.timestamp_to * 1000,
  }));
}

async function fetchChapterAudioMetadata(
  chapterId: number,
  selectedAudio: number,
): Promise<ChapterAudioResponse> {
  if (!Number.isFinite(chapterId) || chapterId < 1 || chapterId > 114) {
    throw new Error(`CHAPTER_OUT_OF_RANGE_${chapterId}`);
  }

  const attempts: Array<string> = [
    `/content/chapter_recitations/${selectedAudio}/${chapterId}`,
    `/content/chapter_recitations/${chapterId}/${selectedAudio}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of attempts) {
    try {
      return (await callQF(endpoint, {
        params: { segments: true },
        silentErrorLog: true,
      })) as ChapterAudioResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("CHAPTER_AUDIO_METADATA_FAILED");
}

export const useQuranAudio = (chapterId: number) => {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    playerState,
    readerActive,
    selectedAudio,
    setMode,
    setPlayerState,
    setPlayingAyah,
    setSelectedAyah,
    showUI,
  } = useReaderStore();

  const soundRef = useRef<Audio.Sound | null>(null);
  const chapterSegmentsRef = useRef<ChapterAudioSegment[]>([]);
  const currentSegmentIndexRef = useRef(0);
  const activeOperationRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const requestKeyRef = useRef(`${selectedAudio}:${chapterId}`);

  const requestKey = `${selectedAudio}:${chapterId}`;

  const loadChapterMetadata = useCallback(async () => {
    const response = await fetchChapterAudioMetadata(chapterId, selectedAudio);

    chapterSegmentsRef.current = normalizeSegments(
      response.audio_file?.segments ?? response.segments ?? [],
    );
    currentSegmentIndexRef.current = 0;

    return response;
  }, [chapterId, selectedAudio]);

  const updateActiveAyah = useCallback(
    (positionMillis: number) => {
      const segments = chapterSegmentsRef.current;

      if (segments.length === 0) {
        return;
      }

      let index = Math.min(
        currentSegmentIndexRef.current,
        segments.length - 1,
      );

      while (
        index < segments.length - 1 &&
        positionMillis > segments[index]!.timestamp_to
      ) {
        index += 1;
      }

      while (index > 0 && positionMillis < segments[index]!.timestamp_from) {
        index -= 1;
      }

      const activeSegment = segments[index];

      if (
        !activeSegment ||
        positionMillis < activeSegment.timestamp_from ||
        positionMillis > activeSegment.timestamp_to
      ) {
        return;
      }

      currentSegmentIndexRef.current = index;
      setPlayingAyah(activeSegment.verse_key);

      const ayah = parseVerseKey(activeSegment.verse_key);
      if (ayah) {
        setSelectedAyah(ayah);
      }
    },
    [setPlayingAyah, setSelectedAyah],
  );

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          setError(status.error);
          setPlayerState("error");
        }
        return;
      }

      if (status.didJustFinish) {
        setPlayerState("paused");
        showUI();
        setMode("recitation");

        if (chapterSegmentsRef.current.length > 0) {
          const lastSegment =
            chapterSegmentsRef.current[chapterSegmentsRef.current.length - 1];
          if (lastSegment) {
            setPlayingAyah(lastSegment.verse_key);
            const ayah = parseVerseKey(lastSegment.verse_key);
            if (ayah) {
              setSelectedAyah(ayah);
            }
          }
        }

        return;
      }

      if (status.isBuffering) {
        setPlayerState("buffering");
      } else if (status.isPlaying) {
        setPlayerState("playing");
      } else if (playerState !== "downloading") {
        setPlayerState("paused");
      }

      updateActiveAyah(status.positionMillis);
    },
    [
      playerState,
      setMode,
      setPlayerState,
      setPlayingAyah,
      setSelectedAyah,
      showUI,
      updateActiveAyah,
    ],
  );

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;

    if (!sound) {
      return;
    }

    sound.setOnPlaybackStatusUpdate(null);

    try {
      await sound.unloadAsync();
    } catch (unloadError) {
      console.error("Failed to unload Quran audio:", unloadError);
    }
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const operationKey = requestKey;
    const directory = new Directory(Paths.document, "audio", String(selectedAudio));
    const audioFile = new File(directory, `${chapterId}.mp3`);

    if (!directory.exists) {
      directory.create({ idempotent: true, intermediates: true });
    }

    const chapterAudio = await loadChapterMetadata();

    if (requestKeyRef.current !== operationKey) {
      throw new Error("AUDIO_REQUEST_STALE");
    }

    if (!audioFile.exists) {
      const audioUrl =
        chapterAudio.audio_file?.audio_url ??
        chapterAudio.audio_url ??
        chapterAudio.url;

      if (!audioUrl) {
        throw new Error("AUDIO_URL_NOT_FOUND");
      }

      setPlayerState("downloading");
      setDownloadProgress(0);

      await downloadAudioFileWithProgress(audioUrl, audioFile, (progress) => {
        if (mountedRef.current) {
          setDownloadProgress(progress);
        }
      });
    }

    if (requestKeyRef.current !== operationKey) {
      throw new Error("AUDIO_REQUEST_STALE");
    }

    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioFile.uri },
        {
          shouldPlay: false,
          progressUpdateIntervalMillis: AUDIO_PROGRESS_INTERVAL_MS,
        },
        handlePlaybackStatusUpdate,
      );

      soundRef.current = sound;
    } else {
      soundRef.current.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
    }

    return soundRef.current;
  }, [
    chapterId,
    handlePlaybackStatusUpdate,
    loadChapterMetadata,
    requestKey,
    selectedAudio,
    setPlayerState,
  ]);

  const runExclusive = useCallback(async (operation: () => Promise<void>) => {
    if (activeOperationRef.current) {
      return activeOperationRef.current;
    }

    const promise = (async () => {
      try {
        await operation();
      } finally {
        activeOperationRef.current = null;
      }
    })();

    activeOperationRef.current = promise;
    return promise;
  }, []);

  const playChapter = useCallback(async () => {
    return runExclusive(async () => {
      if (!readerActive) {
        throw new Error("READER_NOT_ACTIVE");
      }

      setError(null);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const sound = await ensureAudioReady();

      showUI();
      setMode("recitation");
      setPlayerState("buffering");

      const status = await sound.getStatusAsync();

      if (!status.isLoaded) {
        throw new Error("AUDIO_NOT_LOADED");
      }

      const hasFinished =
        status.didJustFinish ||
        (typeof status.durationMillis === "number" &&
          status.positionMillis >= status.durationMillis);

      if (hasFinished) {
        currentSegmentIndexRef.current = 0;
        await sound.replayAsync({
          shouldPlay: true,
          progressUpdateIntervalMillis: AUDIO_PROGRESS_INTERVAL_MS,
        });
        return;
      }

      await sound.playAsync();
    }).catch((playError) => {
      if (playError instanceof Error && playError.message === "AUDIO_REQUEST_STALE") {
        return;
      }

      const message =
        playError instanceof Error ? playError.message : "AUDIO_PLAYBACK_FAILED";
      setError(message);
      setPlayerState("error");
    });
  }, [ensureAudioReady, readerActive, runExclusive, setMode, setPlayerState, showUI]);

  const pauseChapter = useCallback(async () => {
    return runExclusive(async () => {
      if (!soundRef.current) {
        return;
      }

      await soundRef.current.pauseAsync();
      setPlayerState("paused");
      showUI();
      setMode("recitation");
    }).catch((pauseError) => {
      const message =
        pauseError instanceof Error ? pauseError.message : "AUDIO_PAUSE_FAILED";
      setError(message);
      setPlayerState("error");
    });
  }, [runExclusive, setMode, setPlayerState, showUI]);

  const togglePlayback = useCallback(async () => {
    if (playerState === "playing" || playerState === "buffering") {
      await pauseChapter();
      return;
    }

    await playChapter();
  }, [pauseChapter, playChapter, playerState]);

  useEffect(() => {
    if (readerActive) {
      return;
    }

    setPlayerState("idle");
    setPlayingAyah(null);
    void unloadSound();
  }, [readerActive, setPlayerState, setPlayingAyah, unloadSound]);

  useEffect(() => {
    mountedRef.current = true;
    requestKeyRef.current = requestKey;

    setDownloadProgress(0);
    setError(null);
    chapterSegmentsRef.current = [];
    currentSegmentIndexRef.current = 0;
    setPlayingAyah(null);
    setPlayerState("idle");

    void unloadSound();

    return () => {
      mountedRef.current = false;
      void unloadSound();
    };
  }, [
    chapterId,
    requestKey,
    selectedAudio,
    setPlayerState,
    setPlayingAyah,
    unloadSound,
  ]);

  return {
    playChapter,
    pauseChapter,
    togglePlayback,
    downloadProgress,
    isDownloading: playerState === "downloading",
    playerState,
    error,
  };
};
