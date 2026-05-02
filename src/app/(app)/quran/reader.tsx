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
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
import { useFullscreenSystemUI } from "@/src/hooks/useFullscreenSystemUI";
import { TallyCounter } from "@/src/features/quran/components/TallyCounter";

import {
  getAyahPage,
  getPageData,
} from "@/src/features/quran/services";
import { parseVerseKey } from "@/src/features/quran/services/bookmarkApi";

import { PageData } from "@/src/features/quran/type";
import { useSession } from "@/src/hooks/useSession";
import { insertHabitProgressLog } from "@/src/features/habits/services/habitProgressService";
import { habitAnalyticsService } from "@/src/features/habits/services/habitAnalyticsService";
import { useSQLiteContext } from "expo-sqlite";
import { hifzService } from "@/src/features/hifz/services/hifzService";
import { murajaService } from "@/src/features/muraja/services/murajaService";
import { Alert } from "@/src/components/common/Alert";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ALL_PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

export default function QuranReaderScreen() {
  const db = useSQLiteContext()
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

  const sessionStartRef = useRef(Date.now());
  const { user } = useSession();

  const openReaderSession = useReaderSessionStore((s) => s.openSession);
  const setSessionPage = useReaderSessionStore((s) => s.setPage);
  const updateSessionTally = useReaderSessionStore((s) => s.updateTally);
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
  const [completionVisible, setCompletionVisible] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const isTaskActive = !!planId && !!type && !!start && !!end;
  const targetEndPage = Number(end);
  const isAtEnd = isTaskActive && currentPage === targetEndPage;
  
  useEffect(() => {
    updateSessionTally(tallyCounts);
  }, [tallyCounts, updateSessionTally]);

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

        const durationMs = Date.now() - sessionStartRef.current;
        const minutes = Math.floor(durationMs / 60000);
        if (minutes > 0) {
          void insertHabitProgressLog(undefined, {
            userId: habitUserId,
            date: new Date().toISOString().split("T")[0],
            activityType: "NORMAL_READING",
            minutesSpent: minutes,
            unitsCompleted: 0, 
          }).then(() => {
            void habitAnalyticsService.recalculateStreaks(habitUserId);
          });
        }
      };
    }, [hideUI, navigation, resetSelection, setReaderActive, habitUserId]),
  );

  useEffect(() => {
    openReaderSession(currentPage);
  }, [openReaderSession]); 

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
              const data = await getPageData(p,db);
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
  }, [currentPage]);

  useEffect(() => {
    const syncToDeepLink = async () => {
      if (initialAyah) {
        const parsed = parseVerseKey(initialAyah);
        if (parsed) {
          const targetPage = await getAyahPage(
            parsed.sura,
            parsed.ayah,
            db
          );
          if (targetPage) {
            setCurrentPage(targetPage);
            setSessionPage(targetPage);
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
        setSessionPage(p);
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
        setSessionPage(pageNum);
        if (selectedAyah) resetSelection();
      }
    },
    [width, currentPage, selectedAyah, resetSelection, setSessionPage],
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

      <TallyCounter 
        visible={tallyMode} 
        onCountsChange={setTallyCounts} 
      />

      {isAtEnd && !completionVisible && (
        <View className="absolute bottom-32 left-0 right-0 items-center px-6">
          <Pressable 
            onPress={() => setCompletionVisible(true)}
            className="bg-[#276359] flex-row items-center justify-center px-8 py-4 rounded-full shadow-lg"
          >
            <Ionicons name="checkmark-done-circle" size={24} color="white" />
            <Text className="text-white  ml-3 uppercase tracking-widest text-sm">
              Finish {type === 'hifz' ? 'Hifz' : 'Muraja'}
            </Text>
          </Pressable>
        </View>
      )}

      <Alert
        visible={completionVisible}
        type="success"
        title="Session Completed!"
        message={`Great job! You've reached your goal of page ${end}. Ready to log your progress?`}
        confirmText={isLogging ? "Logging..." : "Log Completion"}
        cancelText="Keep Reading"
        onConfirm={async () => {
          if (isLogging) return;
          setIsLogging(true);
          try {
            const todayStr = new Date().toISOString().slice(0, 10);
            if (type === 'hifz') {
               await hifzService.todayLog(user?.id || '', {
                hifz_plan_id: Number(planId),
                actual_start_page: Number(start),
                actual_end_page: Number(end),
                actual_pages_completed: Number(end) - Number(start) + 1,
                date: todayStr,
                log_day: (new Date().getDay() + 6) % 7,
                status: "completed",
                mistakes_count: tallyCounts.mistakes,
                hesitation_count: tallyCounts.hesitations,
              });
            } else if (type === 'muraja') {
              await murajaService.upsertLog(user?.id || '', {
                plan_id: Number(planId),
                date: todayStr,
                start_page: Number(start),
                completed_pages: Number(end) - Number(start) + 1,
                status: "completed",
                actual_time_min: 0,
                is_catchup: 0,
                sync_status: 0,
                remote_id: null,
                mistakes_count: tallyCounts.mistakes,
                hesitation_count: tallyCounts.hesitations,
              });
            }
            setCompletionVisible(false);
            navigation.goBack();
          } catch (e) {
            console.error(e);
          } finally {
            setIsLogging(false);
          }
        }}
        onCancel={() => setCompletionVisible(false)}
      />
    </GestureHandlerRootView>
  );
}
