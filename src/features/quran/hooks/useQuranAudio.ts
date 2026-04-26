import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChapterAudioSegment,
  fetchChapterAudioMetadata,
  normalizeSegments,
  downloadAudioFileWithProgress,
} from "../services";
import { useReaderStore } from "./useReaderStore";


function parseVerseKey(verseKey: string) {
  const [sura, ayah] = verseKey.split(":").map(Number);
  return (sura && ayah) ? { sura, ayah } : null;
}

export const useQuranAudio = (chapterId: number) => {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);

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

  const player = useAudioPlayer(sourceUri);
  const status = useAudioPlayerStatus(player);
  
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

  const updateActiveAyah = useCallback((positionMillis: number) => {
    const segments = chapterSegmentsRef.current;
    if (segments.length === 0) return;

    let index = Math.min(currentSegmentIndexRef.current, segments.length - 1);
    while (index < segments.length - 1 && positionMillis > segments[index]!.timestamp_to) index += 1;
    while (index > 0 && positionMillis < segments[index]!.timestamp_from) index -= 1;

    const activeSegment = segments[index];
    if (!activeSegment || positionMillis < activeSegment.timestamp_from || positionMillis > activeSegment.timestamp_to) return;

    currentSegmentIndexRef.current = index;
    setPlayingAyah(activeSegment.verse_key);
    const ayah = parseVerseKey(activeSegment.verse_key);
    if (ayah) setSelectedAyah(ayah);
  }, [setPlayingAyah, setSelectedAyah]);

  useEffect(() => {
    if (status.isBuffering) {
      setPlayerState("buffering");
    } else if (status.playing) {
      setPlayerState("playing");
    } else if (playerState !== "downloading" && playerState !== "idle") {
      setPlayerState("paused");
    }

    if (status.currentTime) {
      updateActiveAyah(status.currentTime * 1000); 
    }
  }, [status.isBuffering, status.playing, status.currentTime, playerState, setPlayerState, updateActiveAyah]);

  useEffect(() => {
    if (status.isBuffering) {
      setPlayerState("buffering");
    } else if (status.playing) {
      setPlayerState("playing");
    } else if (playerState !== "downloading" && playerState !== "idle") {
      setPlayerState("paused");
    }

    if (status.currentTime) {
      updateActiveAyah(status.currentTime * 1000); 
    }
  }, [status.isBuffering, status.playing, status.currentTime, playerState, setPlayerState, updateActiveAyah]);

  useEffect(() => {
    if (status.playbackState === "finished") {
      setPlayerState("paused");
      showUI();
      setMode("recitation");
      
      if (chapterSegmentsRef.current.length > 0) {
        const last = chapterSegmentsRef.current[chapterSegmentsRef.current.length - 1];
        if (last) {
          setPlayingAyah(last.verse_key);
          const ayah = parseVerseKey(last.verse_key);
          if (ayah) setSelectedAyah(ayah);
        }
      }
    }
  }, [status.playbackState, setMode, setPlayerState, setPlayingAyah, setSelectedAyah, showUI]);

  const ensureAudioReady = useCallback(async () => {
    const opKey = requestKey;
    const dir = new Directory(Paths.document, "audio", String(selectedAudio));
    const file = new File(dir, `${chapterId}.mp3`);

    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });

    const metadata = await loadChapterMetadata();
    if (requestKeyRef.current !== opKey) throw new Error("AUDIO_REQUEST_STALE");

    if (!file.exists) {
      const url = metadata.audio_file?.audio_url ?? metadata.audio_url ?? metadata.url;
      if (!url) throw new Error("AUDIO_URL_NOT_FOUND");

      setPlayerState("downloading");
      setDownloadProgress(0);
      await downloadAudioFileWithProgress(url, file, (p) => {
        if (mountedRef.current) setDownloadProgress(p);
      });
    }

    if (requestKeyRef.current !== opKey) throw new Error("AUDIO_REQUEST_STALE");
    setSourceUri(file.uri);
    return player;
  }, [chapterId, loadChapterMetadata, player, requestKey, selectedAudio, setPlayerState]);

  const runExclusive = useCallback(async (op: () => Promise<void>) => {
    if (activeOperationRef.current) return activeOperationRef.current;
    const p = (async () => {
      try { await op(); } finally { activeOperationRef.current = null; }
    })();
    activeOperationRef.current = p;
    return p;
  }, []);

  const playChapter = useCallback(async () => {
    return runExclusive(async () => {
      if (!readerActive) throw new Error("READER_NOT_ACTIVE");
      setError(null);
      await ensureAudioReady();
      showUI();
      setMode("recitation");
      player.play();
    }).catch((e) => {
      if (e instanceof Error && e.message === "AUDIO_REQUEST_STALE") return;
      setError(e instanceof Error ? e.message : "AUDIO_PLAYBACK_FAILED");
      setPlayerState("error");
    });
  }, [ensureAudioReady, player, readerActive, runExclusive, setMode, setPlayerState, showUI]);

  const pauseChapter = useCallback(async () => {
    return runExclusive(async () => {
      player.pause();
      setPlayerState("paused");
      showUI();
      setMode("recitation");
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "AUDIO_PAUSE_FAILED");
      setPlayerState("error");
    });
  }, [player, runExclusive, setMode, setPlayerState, showUI]);

  const togglePlayback = useCallback(async () => {
    (player.playing) ? await pauseChapter() : await playChapter();
  }, [pauseChapter, playChapter, player.playing]);

  useEffect(() => {
    if (readerActive) return;
    setPlayerState("idle");
    setPlayingAyah(null);
    player.pause();
  }, [readerActive, player, setPlayerState, setPlayingAyah]);

  useEffect(() => {
    mountedRef.current = true;
    requestKeyRef.current = requestKey;
    setDownloadProgress(0);
    setError(null);
    chapterSegmentsRef.current = [];
    currentSegmentIndexRef.current = 0;
    setPlayingAyah(null);
    setPlayerState("idle");
    setSourceUri(null);
    return () => { mountedRef.current = false; };
  }, [chapterId, requestKey, selectedAudio, setPlayerState, setPlayingAyah]);

  return { playChapter, pauseChapter, togglePlayback, downloadProgress, isDownloading: playerState === "downloading", playerState, error };
};
