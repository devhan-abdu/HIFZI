import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { StatusBar } from "expo-status-bar";

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
  } = useReaderStore();

  const [tallyCounts, setTallyCounts] = useState({ mistakes: 0, hesitations: 0 });

  const habitUserId = user?.id ?? "local-user";

  useFullscreenSystemUI(!uiVisible);

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

      <ReaderHeader pageData={pageMeta[currentPage]} />

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
    </GestureHandlerRootView>
  );
}
