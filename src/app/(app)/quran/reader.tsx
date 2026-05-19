import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, FlatList, useWindowDimensions, TouchableOpacity, Text } from "react-native";
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
import { useReaderStore } from "@/src/features/quran/hooks/useReaderStore";
import { useFullscreenSystemUI } from "@/src/hooks/useFullscreenSystemUI";
import { TallyCounter } from "@/src/features/quran/components/TallyCounter";
import { PageMetaOverlay } from "@/src/features/quran/components/PageMetaOverlay";

import {
  getAyahPage,
  getPageData,
  getChaptersForPage,
} from "@/src/features/quran/services";
import { parseVerseKey } from "@/src/features/quran/services/bookmarkApi";

import { PageData } from "@/src/features/quran/type";
import { useSession } from "@/src/hooks/useSession";
import { useSQLiteContext } from "expo-sqlite";

import { prefetchPages, countDownloadedPages, downloadAllPages } from "@/src/features/quran/services/quranImageService";
import { warmTranslationPage } from "@/src/features/quran/services/translationPageService";

const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

export default function QuranReaderScreen() {
  const db = useSQLiteContext();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const { page: initialPage, ayah: initialAyah, planId, type, start, end } = useLocalSearchParams<{
    page?: string;
    ayah?: string;
    planId?: string;
    type?: "hifz" | "muraja";
    start?: string;
    end?: string;
  }>();

  const [currentPage, setCurrentPage] = useState(Number(initialPage) || 1);
  const [pageMeta, setPageMeta] = useState<Record<number, PageData>>({});
  /** All surah IDs present on a given page — used for the audio chapter picker */
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
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null);

  const habitUserId = user?.id ?? "local-user";

  useFullscreenSystemUI(!uiVisible);

  // Check and show onboarding prompt for downloading all pages
  useEffect(() => {
    const checkPrompt = async () => {
      try {
        const shown = await AsyncStorage.getItem("quran_images_prompt_shown");
        if (shown !== "true") {
          const downloaded = await countDownloadedPages();
          if (downloaded < 604) {
            setShowPrompt(true);
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

  const handleConfirmPrompt = async () => {
    setShowPrompt(false);
    await AsyncStorage.setItem("quran_images_prompt_shown", "true");
    setIsDownloadingAll(true);
    try {
      await downloadAllPages((downloaded, total) => {
        setDownloadProgress({ downloaded, total });
        if (downloaded >= total) {
          setIsDownloadingAll(false);
        }
      });
    } catch (e) {
      console.error(e);
      setIsDownloadingAll(false);
    }
  };

  const handleCancelPrompt = async () => {
    setShowPrompt(false);
    await AsyncStorage.setItem("quran_images_prompt_shown", "true");
  };

  // Prefetch/Warmup adjacent pages on page or viewMode change
  useEffect(() => {
    if (viewMode === "mushaf") {
      void prefetchPages(currentPage);
    } else {
      void warmTranslationPage(currentPage, selectedTranslations);
    }
  }, [currentPage, viewMode, selectedTranslations]);

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
    syncPageToRecitation();
  }, [playingAyah]);

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

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [currentPage]);

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
    syncToDeepLink();
  }, []);

  const onScrollEnd = useCallback(
    (e: any) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      const pageNum = ALL_PAGES[index];
      if (pageNum && pageNum !== currentPage) {
        setCurrentPage(pageNum);
        if (selectedAyah) resetSelection();
      }
    },
    [width, currentPage, selectedAyah, resetSelection],
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

  // All surah IDs on the current page (falls back to single surah from pageMeta)
  const currentChapterIds: number[] =
    pageChapters[currentPage] ??
    (pageMeta[currentPage]?.number ? [pageMeta[currentPage]!.number] : [1]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" hidden={!uiVisible} animated />

      <ReaderHeader 
        pageData={pageMeta[currentPage]} 
        isDownloadingAll={isDownloadingAll}
        downloadProgress={downloadProgress}
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
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />

      {/* Always-visible meta overlay: surah name, juz, page number */}
      <PageMetaOverlay pageData={pageMeta[currentPage]} />

      <ReaderBottomSheet chapterIds={currentChapterIds} />

      <TallyCounter
        visible={tallyMode}
        onCountsChange={setTallyCounts}
      />

      {/* Onboarding On-Demand Full Page Download Bottom Sheet Prompt */}
      {showPrompt && (
        <View 
          style={{ 
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0, 
            backgroundColor: "#fff", 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 24, 
            padding: 24, 
            shadowColor: "#000", 
            shadowOffset: { width: 0, height: -4 }, 
            shadowOpacity: 0.1, 
            shadowRadius: 12, 
            elevation: 20, 
            zIndex: 1000 
          }}
        >
          <Text className="text-lg  text-slate-800 mb-2">
            Download Quran Pages?
          </Text>
          <Text className="text-sm text-slate-500 leading-relaxed mb-6">
            Would you like to download all 604 Quran pages for offline reading? This downloads about 50 MB once so you can read seamlessly without internet.
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-slate-100 py-3.5 rounded-2xl items-center"
              onPress={handleCancelPrompt}
            >
              <Text className="text-slate-600 ">Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: "#0d9488" }}
              className="flex-1 py-3.5 rounded-2xl items-center"
              onPress={handleConfirmPrompt}
            >
              <Text className="text-white ">Download Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}
