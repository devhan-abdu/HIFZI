import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";

import { MushafPage } from "@/src/features/mushaf/components/MushafPage";
import { TranslationPage } from "@/src/features/quran/components/TranslationPage";
import { ReaderBottomSheet } from "@/src/features/quran/components/ReaderBottomSheet";
import ReaderHeader from "@/src/features/quran/components/ReaderHeader";
import {
  MushafPageSkeleton,
  TranslationPageSkeleton,
} from "@/src/features/quran/components/QuranPageSkeletons";
import { useReaderStore } from "@/src/features/quran/hooks/useReaderStore";
import { useFullscreenSystemUI } from "@/src/hooks/useFullscreenSystemUI";
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
import { useSQLiteContext } from "expo-sqlite";

import { prefetchPages } from "@/src/features/quran/services/quranImageService";
import { warmTranslationPage } from "@/src/features/quran/services/translationPageService";
import {
  getLastReadPage,
  setLastReadPage,
} from "@/src/features/quran/services/quranLastReadStorage";

const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

export default function QuranReaderScreen() {
  const db = useSQLiteContext();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const initialScrollApplied = useRef(false);

  const { page: initialPage, ayah: initialAyah } = useLocalSearchParams<{
    page?: string;
    ayah?: string;
    planId?: string;
    type?: "hifz" | "muraja";
    start?: string;
    end?: string;
  }>();

  const hasAyahParam = Boolean(initialAyah && String(initialAyah).length > 0);
  const hasPageParam = Boolean(initialPage && String(initialPage).length > 0);
  const hasInitialPageOnly = hasPageParam && !hasAyahParam;

  const [bootstrapDone, setBootstrapDone] = useState(hasInitialPageOnly);
  const [currentPage, setCurrentPage] = useState(() => {
    if (hasInitialPageOnly) {
      return Math.min(604, Math.max(1, Number(initialPage) || 1));
    }
    return 1;
  });

  const [pageMeta, setPageMeta] = useState<Record<number, PageData>>({});
  const [pageChapters, setPageChapters] = useState<Record<number, number[]>>({});

  const {
    selectedAyah,
    resetSelection,
    uiVisible,
    hideUI,
    viewMode,
    setReaderActive,
    setSelectedAyah,
    playingAyah,
    selectedTranslations,
  } = useReaderStore();

  const [, setTallyCounts] = useState({ mistakes: 0, hesitations: 0 });

  useFullscreenSystemUI(!uiVisible);

  useEffect(() => {
    if (hasInitialPageOnly) return;

    let cancelled = false;

    const run = async () => {
      if (hasAyahParam && initialAyah) {
        const parsed = parseVerseKey(initialAyah);
        if (!parsed) {
          if (!cancelled) setBootstrapDone(true);
          return;
        }
        const targetPage = await getAyahPage(parsed.sura, parsed.ayah, db);
        if (cancelled) return;
        if (targetPage) {
          setCurrentPage(targetPage);
          setSelectedAyah({ sura: parsed.sura, ayah: parsed.ayah });
        }
        setBootstrapDone(true);
        return;
      }

      const last = await getLastReadPage();
      if (cancelled) return;
      setCurrentPage(last ?? 1);
      setBootstrapDone(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [db, hasAyahParam, hasInitialPageOnly, initialAyah, setSelectedAyah]);

  useEffect(() => {
    if (!bootstrapDone || initialScrollApplied.current) return;
    initialScrollApplied.current = true;
    const id = requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({
          index: currentPage - 1,
          animated: false,
        });
      } catch {
        /* FlatList may not be ready on some platforms */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [bootstrapDone, currentPage]);

  useEffect(() => {
    if (!bootstrapDone) return;
    void setLastReadPage(currentPage);
  }, [bootstrapDone, currentPage]);

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
      setReaderActive(true);

      return () => {
        setReaderActive(false);
        resetSelection();
        hideUI();
      };
    }, [hideUI, resetSelection, setReaderActive]),
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
        Array.from({ length: end - start + 1 }, (_, i) => start + i).map(async (p) => {
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
        }),
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
          <MushafPage pageNumber={item} isActive={item === currentPage} />
        </View>
      );
    },
    [height, width, viewMode, pageChapters, pageMeta, currentPage],
  );

  const currentChapterIds: number[] =
    pageChapters[currentPage] ??
    (pageMeta[currentPage]?.number ? [pageMeta[currentPage]!.number] : [1]);

  if (!bootstrapDone) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        {viewMode === "translation" ? <TranslationPageSkeleton /> : <View style={{ flex: 1 }} />}
      </GestureHandlerRootView>
    );
  }

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
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        removeClippedSubviews
      />

      <PageMetaOverlay pageData={pageMeta[currentPage]} />

      <ReaderBottomSheet chapterIds={currentChapterIds} />
    </GestureHandlerRootView>
  );
}
