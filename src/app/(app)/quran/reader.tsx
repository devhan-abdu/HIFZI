import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, FlatList, useWindowDimensions, Pressable } from "react-native";
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
import { useReaderStore } from "@/src/features/quran/hook/useReaderStore";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
import { useFullscreenSystemUI } from "@/src/hooks/useFullscreenSystemUI";

import {
  getAyahPage,
  getPageData,
} from "@/src/features/quran/services";
import { parseVerseKey } from "@/src/features/quran/services/bookmarkApi";

import { PageData } from "@/src/features/quran/type";
import { useSession } from "@/src/hooks/useSession";
import { processDailyActivity } from "@/src/features/habit/services/habitService";
import { useSQLiteContext } from "expo-sqlite";
import { useQuranStateDb } from "@/src/lib/db/QuranStateDatabaseProvider";

const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

export default function QuranReaderScreen() {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const { page: initialPage, ayah: initialAyah } = useLocalSearchParams<{
    page?: string;
    ayah?: string;
  }>();

  // Core State
  const [currentPage, setCurrentPage] = useState(Number(initialPage) || 1);
  const [pageMeta, setPageMeta] = useState<Record<number, PageData>>({});

  const sessionStartRef = useRef(Date.now());
  const coreDb = useSQLiteContext();
  const stateDb = useQuranStateDb();
  const { user } = useSession();

  const openReaderSession = useReaderSessionStore((s) => s.openSession);
  const {
    selectedAyah,
    resetSelection,
    uiVisible,
    hideUI,
    toggleUI,
    viewMode,
    setReaderActive,
    setSelectedAyah,
  } = useReaderStore();

  const habitUserId = user?.id ?? "local-user";

  // Toggle full-screen UI
  useFullscreenSystemUI(!uiVisible);

  // 1. Manage Navigation and Reader Context
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
    }, [hideUI, navigation, resetSelection, setReaderActive]),
  );

  // 2. Initialize Session and Activity Tracking
  useEffect(() => {
    openReaderSession(currentPage);
  }, [currentPage, openReaderSession]);

  // 3. Metadata Management (Range-based preloading)
  const RANGE = 3;
  useEffect(() => {
    let isMounted = true;
    const loadMeta = async () => {
      const start = Math.max(1, currentPage - RANGE);
      const end = Math.min(604, currentPage + RANGE);
      const metaUpdates: Record<number, PageData> = {};

      await Promise.all(
        Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
          async (p) => {
            if (!pageMeta[p]) {
              const data = await getPageData(coreDb, p);
              if (data) metaUpdates[p] = data;
            }
          },
        ),
      );

      if (isMounted && Object.keys(metaUpdates).length > 0) {
        setPageMeta((prev) => ({ ...prev, ...metaUpdates }));
      }
    };

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [currentPage, coreDb]);

  // 4. Handle Deep Linking (Ayah/Page from Bookmarks or Search)
  useEffect(() => {
    const syncToDeepLink = async () => {
      if (initialAyah) {
        const parsed = parseVerseKey(initialAyah);
        if (parsed) {
          const targetPage = await getAyahPage(
            coreDb,
            parsed.sura,
            parsed.ayah,
          );
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
  }, [coreDb]);

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
            <TranslationPage pageNumber={item} />
          </View>
        );
      }
      return (
        <View style={{ width, height }}>
          <MushafPage pageNumber={item} />
        </View>
      );
    },
    [height, width, viewMode],
  );

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

      <ReaderBottomSheet
        chapterId={pageMeta[currentPage]?.number ?? 1}
      />
    </GestureHandlerRootView>
  );
}
