import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MushafPage } from "@/src/features/mushaf/components/MushafPage";
import { TranslationPage } from "@/src/features/quran/components/TranslationPage";
import { ReaderBottomSheet } from "@/src/features/quran/components/ReaderBottomSheet";
import ReaderHeader from "@/src/features/quran/components/ReaderHeader";
import { QuranDownloadModal } from "@/src/features/quran/components/QuranDownloadModal";
import { useReaderStore } from "@/src/features/quran/hooks/useReaderStore";
import { useFullscreenSystemUI } from "@/src/hooks/useFullscreenSystemUI";
import { TallyCounter } from "@/src/features/quran/components/TallyCounter";
import { PageMetaOverlay } from "@/src/features/quran/components/PageMetaOverlay";

import {
  getAyahPage,
  getPageData,
  getChaptersForPage,
  getAyahBBoxesByPage,
} from "@/src/features/quran/services";
import { parseVerseKey } from "@/src/features/quran/services/bookmarkApi";
import { ayahExistsOnPage } from "@/src/features/mushaf/utils/bboxGrouping";
import {
  getCachedBboxes,
  warmBboxCache,
} from "@/src/features/quran/services/mushafResourceCache";

import { PageData } from "@/src/features/quran/type";
import { useSession } from "@/src/hooks/useSession";
import { useSQLiteContext } from "expo-sqlite";

import {
  prefetchPages,
  countDownloadedPages,
  downloadAllPages,
  type DownloadProgress,
} from "@/src/features/quran/services/quranImageService";
import { warmTranslationPage } from "@/src/features/quran/services/translationPageService";

const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

const IDLE_PROGRESS: DownloadProgress = {
  downloaded: 0,
  total: 604,
  remaining: 604,
  percent: 0,
  currentPages: [],
  status: "idle",
};

export default function QuranReaderScreen() {
  const db = useSQLiteContext();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const downloadAbortRef = useRef<AbortController | null>(null);

  const { page: initialPage, ayah: initialAyah } = useLocalSearchParams<{
    page?: string;
    ayah?: string;
    planId?: string;
    type?: "hifz" | "muraja";
    start?: string;
    end?: string;
  }>();

  const [currentPage, setCurrentPage] = useState(Number(initialPage) || 1);
  const [pageMeta, setPageMeta] = useState<Record<number, PageData>>({});
  const [pageChapters, setPageChapters] = useState<Record<number, number[]>>({});

  const { user } = useSession();

  const {
    selectedAyah,
    resetSelection,
    uiVisible,
    hideUI,
    viewMode,
    setReaderActive,
    setSelectedAyah,
    tallyMode,
    playingAyah,
    selectedTranslations,
  } = useReaderStore();

  const [tallyCounts, setTallyCounts] = useState({ mistakes: 0, hesitations: 0 });
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadPromptMode, setDownloadPromptMode] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const habitUserId = user?.id ?? "local-user";

  useFullscreenSystemUI(!uiVisible);

  useEffect(() => {
    const checkPrompt = async () => {
      try {
        const shown = await AsyncStorage.getItem("quran_images_prompt_shown");
        if (shown !== "true") {
          const downloaded = await countDownloadedPages();
          if (downloaded < 604) {
            setDownloadPromptMode(true);
            setDownloadModalVisible(true);
          } else {
            await AsyncStorage.setItem("quran_images_prompt_shown", "true");
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    void checkPrompt();
  }, []);

  const runDownload = useCallback(async () => {
    downloadAbortRef.current?.abort();
    const controller = new AbortController();
    downloadAbortRef.current = controller;

    try {
      await downloadAllPages((progress) => {
        setDownloadProgress(progress);
        if (progress.status === "completed") {
          void AsyncStorage.setItem("quran_images_prompt_shown", "true");
        }
      }, controller.signal);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleStartDownload = async () => {
    setDownloadPromptMode(false);
    await AsyncStorage.setItem("quran_images_prompt_shown", "true");
    setDownloadProgress({
      ...IDLE_PROGRESS,
      status: "running",
    });
    void runDownload();
  };

  const handleCancelDownloadPrompt = async () => {
    setDownloadModalVisible(false);
    setDownloadPromptMode(false);
    await AsyncStorage.setItem("quran_images_prompt_shown", "true");
  };

  const handleDismissDownloadModal = () => {
    setDownloadModalVisible(false);
    setDownloadPromptMode(false);
  };

  const handleBackgroundDownload = () => {
    setDownloadModalVisible(false);
    setDownloadPromptMode(false);
  };

  const openDownloadModal = useCallback(async () => {
    const downloaded = await countDownloadedPages();
    setDownloadPromptMode(false);
    setDownloadProgress({
      downloaded,
      total: 604,
      remaining: 604 - downloaded,
      percent: downloaded / 604,
      currentPages: [],
      status: downloaded >= 604 ? "completed" : "idle",
    });
    setDownloadModalVisible(true);
    if (downloaded < 604) {
      void runDownload();
    }
  }, [runDownload]);

  useEffect(() => {
    if (viewMode === "mushaf") {
      prefetchPages(currentPage);
      const pages: number[] = [];
      for (let d = -3; d <= 3; d++) {
        const p = currentPage + d;
        if (p >= 1 && p <= 604) pages.push(p);
      }
      warmBboxCache(pages, (p) => getAyahBBoxesByPage(p, db));
    } else {
      warmTranslationPage(currentPage, selectedTranslations);
    }
  }, [currentPage, viewMode, selectedTranslations, db]);

  useEffect(() => {
    const syncPageToRecitation = async () => {
      if (playingAyah) {
        const parsed = parseVerseKey(playingAyah);
        if (parsed) {
          const targetPage = await getAyahPage(parsed.sura, parsed.ayah, db);
          if (targetPage && targetPage !== currentPage) {
            setCurrentPage(targetPage);
            listRef.current?.scrollToIndex({
              index: targetPage - 1,
              animated: true,
            });
          }
        }
      }
    };
    void syncPageToRecitation();
  }, [playingAyah, db, currentPage]);

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      setReaderActive(true);
      parent?.setOptions({ tabBarStyle: { display: "none" } });

      return () => {
        setReaderActive(false);
        resetSelection();
        hideUI();
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [hideUI, navigation, resetSelection, setReaderActive, habitUserId]),
  );

  const RANGE = 3;
  useEffect(() => {
    let isMounted = true;
    const loadMeta = async () => {
      const start = Math.max(1, currentPage - RANGE);
      const end = Math.min(604, currentPage + RANGE);
      const metaUpdates: Record<number, PageData> = {};
      const chaptersUpdates: Record<number, number[]> = {};

      await Promise.all(
        Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
          async (p) => {
            const needsMeta = !pageMeta[p];
            const needsChapters = !pageChapters[p];
            if (needsMeta || needsChapters) {
              const [data, chapters] = await Promise.all([
                needsMeta ? getPageData(p, db) : Promise.resolve(null),
                needsChapters ? getChaptersForPage(p, db) : Promise.resolve(null),
              ]);
              if (data) metaUpdates[p] = data;
              if (chapters) chaptersUpdates[p] = chapters;
            }
          },
        ),
      );

      if (isMounted) {
        if (Object.keys(metaUpdates).length > 0) {
          setPageMeta((prev) => ({ ...prev, ...metaUpdates }));
        }
        if (Object.keys(chaptersUpdates).length > 0) {
          setPageChapters((prev) => ({ ...prev, ...chaptersUpdates }));
        }
      }
    };

    void loadMeta();
    return () => {
      isMounted = false;
    };
  }, [currentPage, db]);

  useEffect(() => {
    const syncToDeepLink = async () => {
      if (initialAyah) {
        const parsed = parseVerseKey(initialAyah);
        if (parsed) {
          const targetPage = await getAyahPage(parsed.sura, parsed.ayah, db);
          if (targetPage) {
            setCurrentPage(targetPage);
            setSelectedAyah({ sura: parsed.sura, ayah: parsed.ayah });
            listRef.current?.scrollToIndex({
              index: targetPage - 1,
              animated: false,
            });
          }
        }
      } else if (initialPage) {
        const p = Number(initialPage);
        setCurrentPage(p);
        listRef.current?.scrollToIndex({ index: p - 1, animated: false });
      }
    };
    void syncToDeepLink();
  }, []);

  const shouldClearSelectionOnPageChange = useCallback(
    async (newPage: number) => {
      if (!selectedAyah) return;

      const cached = getCachedBboxes(newPage);
      if (cached) {
        if (ayahExistsOnPage(cached, selectedAyah.sura, selectedAyah.ayah)) {
          return;
        }
        resetSelection();
        return;
      }

      const ayahHomePage = await getAyahPage(selectedAyah.sura, selectedAyah.ayah, db);
      if (ayahHomePage !== newPage) {
        const bboxes = await getAyahBBoxesByPage(newPage, db);
        if (!ayahExistsOnPage(bboxes, selectedAyah.sura, selectedAyah.ayah)) {
          resetSelection();
        }
      }
    },
    [selectedAyah, resetSelection, db],
  );

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      const pageNum = ALL_PAGES[index];
      if (pageNum && pageNum !== currentPage) {
        setCurrentPage(pageNum);
        void shouldClearSelectionOnPageChange(pageNum);
      }
    },
    [width, currentPage, shouldClearSelectionOnPageChange],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      if (viewMode === "translation") {
        return (
          <View style={{ width, height }}>
            <TranslationPage
              pageNumber={item}
              chapterIds={pageChapters[item] ?? [pageMeta[item]?.number ?? 1]}
            />
          </View>
        );
      }
      return (
        <View style={{ width, height }}>
          <MushafPage pageNumber={item} />
        </View>
      );
    },
    [height, width, viewMode, pageChapters, pageMeta],
  );

  const currentChapterIds: number[] =
    pageChapters[currentPage] ??
    (pageMeta[currentPage]?.number ? [pageMeta[currentPage]!.number] : [1]);

  const isDownloading = downloadProgress?.status === "running";

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" hidden={!uiVisible} animated />

      <ReaderHeader
        pageData={pageMeta[currentPage]}
        isDownloadingAll={isDownloading}
        downloadProgress={
          downloadProgress
            ? {
                downloaded: downloadProgress.downloaded,
                total: downloadProgress.total,
              }
            : null
        }
        onOpenDownload={openDownloadModal}
      />

      <FlatList
        ref={listRef}
        data={ALL_PAGES}
        horizontal
        pagingEnabled
        inverted
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentPage - 1}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={onScrollEnd}
        keyExtractor={(item) => item.toString()}
        renderItem={renderItem}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        removeClippedSubviews
      />

      <PageMetaOverlay pageData={pageMeta[currentPage]} />

      <ReaderBottomSheet chapterIds={currentChapterIds} />

      <TallyCounter visible={tallyMode} onCountsChange={setTallyCounts} />

      <QuranDownloadModal
        visible={downloadModalVisible}
        progress={downloadProgress}
        promptMode={downloadPromptMode}
        onStart={handleStartDownload}
        onCancel={
          downloadPromptMode ? handleCancelDownloadPrompt : handleBackgroundDownload
        }
        onDismiss={handleDismissDownloadModal}
      />
    </GestureHandlerRootView>
  );
}
