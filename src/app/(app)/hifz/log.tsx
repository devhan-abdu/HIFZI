import React, { useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useAddLog } from "@/src/features/hifz/hooks/useAddLog";
import { useRetentionLog } from "@/src/features/habits/hooks/useRetentionLog";
import { useSession } from "@/src/hooks/useSession";
import { Button } from "@/src/components/ui/Button";
import { IHifzLog } from "@/src/features/hifz/types";
import { PerformanceService } from "@/src/services/PerformanceService";
import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Alert } from "@/src/components/common/Alert";
import { LogProgressSkeleton } from "@/src/features/hifz/components/skeleton";
import { Switch } from "@/src/features/hifz/components/Switch";
import { getTodayTask } from "@/src/features/hifz/utils/quran-logic";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";

export default function LogProgress() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    reviewStartPage?: string;
    reviewEndPage?: string;
    reviewCycleDay?: string;
  }>();
  const { user } = useSession();

  const {
    hifz: plan,
    todayTask: logContext,
    loading: planLoading,
  } = useHifzDailyTask();
  const { items: surahData, loading: quranLoading } = useLoadSurahData();
  const { addLog, isCreating: isAddingHifz } = useAddLog();
  const { logRetention, isLogging: isLoggingRetention } = useRetentionLog();

  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<"completed" | "partial" | "missed">(
    "completed",
  );
  const [notes, setNotes] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const reviewStartPage = Number(params.reviewStartPage ?? 0);
  const reviewEndPage = Number(params.reviewEndPage ?? 0);
  const hasReviewPrefill = Number.isFinite(reviewStartPage) && reviewStartPage > 0;

  const sessionMistakes = useReaderSessionStore((s) => s.mistakes);
  const sessionHesitations = useReaderSessionStore((s) => s.hesitations);
  const resetSessionTally = useReaderSessionStore((s) => s.resetTally);

  useEffect(() => {
    if (sessionMistakes > 0) setMistakes(sessionMistakes);
    if (sessionHesitations > 0) setHesitations(sessionHesitations);
    
    if (sessionMistakes > 0 || sessionHesitations > 0) {
      resetSessionTally();
    }
  }, [sessionMistakes, sessionHesitations, resetSessionTally]);

  useEffect(() => {
    if (hasReviewPrefill && reviewEndPage >= reviewStartPage) {
      setPages(Math.max(1, reviewEndPage - reviewStartPage + 1));
      return;
    }
    if (!logContext) return;
    setPages(logContext.totalTarget);
  }, [hasReviewPrefill, logContext, reviewEndPage, reviewStartPage]);

  useEffect(() => {
    const targetPages =
      hasReviewPrefill && reviewEndPage >= reviewStartPage ?
        Math.max(1, reviewEndPage - reviewStartPage + 1)
      : logContext?.totalTarget;
    if (!targetPages) return;
    if (pages >= targetPages) {
      setStatus("completed");
    } else if (pages === 0) {
      setStatus("missed");
    } else {
      setStatus("partial");
    }
  }, [hasReviewPrefill, logContext?.totalTarget, pages, reviewEndPage, reviewStartPage]);

  const handleStatusSelection = (
    selectedStatus: "completed" | "partial" | "missed",
  ) => {
    const targetPages =
      hasReviewPrefill && reviewEndPage >= reviewStartPage ?
        Math.max(1, reviewEndPage - reviewStartPage + 1)
      : (logContext?.totalTarget ?? 1);
    if (selectedStatus === "completed") {
      setPages(targetPages);
    } else if (pages === 0 || selectedStatus === "missed") {
      setPages(0);
    } else {
      setPages(Math.max(1, Math.floor(targetPages / 2)));
    }
  };

  if (planLoading || quranLoading) {
    return <LogProgressSkeleton />;
  }

  if (!plan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-xl  text-slate-900 text-center">
            No Active Plan Found
          </Text>
          <Button className="mt-4" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const isRestDayLog = !logContext?.isPlannedDay && !hasReviewPrefill;

  const handleSave = async () => {
    if (!plan || isAddingHifz || isLoggingRetention || !plan.id)
      return;

    try {
      const today = new Date();
      const logDay = (today.getDay() + 6) % 7;
      const actualTask = getTodayTask(plan, surahData, pages);
      const actualStartPage =
        hasReviewPrefill ? reviewStartPage
        : logContext?.startPage ?? plan.startPage;
      const actualEndPage =
        hasReviewPrefill ? reviewStartPage + Math.max(0, pages - 1)
        : actualTask?.endPage ?? actualStartPage;

      if (hasReviewPrefill) {
        const pagesArray = Array.from({ length: Math.max(0, actualEndPage - actualStartPage + 1) }, (_, i) => actualStartPage + i);
        await logRetention({
          pages: pagesArray,
          quality: PerformanceService.deriveQualityScore(mistakes, hesitations),
          date: today.toISOString().slice(0, 10),
        });
      } else {
        const payload: IHifzLog = {
          hifzPlanId: plan.id,
          actualPagesCompleted: pages,
          actualStartPage: actualStartPage,
          actualEndPage: actualEndPage,
          status,
          date: today.toISOString().slice(0, 10),
          logDay: logDay,
          notes: notes.trim(),
          mistakesCount: mistakes,
          hesitationCount: hesitations,
        };

        await addLog({ todayLog: payload, userId: user?.id });
      }
      
      router.back();
    } catch (err: any) {
      setErrorMessage("We couldn't save your progress. Please check your connection and try again.");
      setErrorVisible(true);
    }
  };

  return (
    <>
      <View className="bg-white px-4 pt-4 pb-4 flex-row items-center border-b border-slate-50">
        <Pressable
          onPress={() => router.replace("/(app)/hifz")}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-lg text-slate-900 ml-2">Log Progress</Text>
      </View>
      <Screen>
        <ScreenContent>
          {/* 1. Session Summary Card - Green Pop (Pro) */}
          <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-xl shadow-primary/30 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Text className="text-white text-[10px] uppercase tracking-[2px]">
                  {hasReviewPrefill ? "Revision Session" : 
                   logContext?.isPlannedDay ? "Scheduled" : "Extra"}
                </Text>
              </View>
              <Text className="text-white/60 text-[10px] uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            <View className="flex-row items-end justify-between">
              <View className="flex-1">
                <Text className="text-white text-3xl tracking-tighter">
                  {hasReviewPrefill ? "Targeted Review" : logContext?.displaySurah}
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  Range: {hasReviewPrefill ? reviewStartPage : (logContext?.startPage ?? 0)} — {hasReviewPrefill ? reviewEndPage : (logContext?.endPage ?? 0)}
                </Text>
              </View>
              <View className="items-end">
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl tracking-tighter">
                    {pages}
                  </Text>
                  <Text className="text-white/40 text-sm ml-1">Pgs</Text>
                </View>
                <Text className="text-white/40 text-[9px] uppercase tracking-widest">Progress</Text>
              </View>
            </View>
          </View>

          <View className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl mb-8 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${reviewed ? 'bg-primary/10' : 'bg-slate-100'}`}>
                <Ionicons name="refresh" size={16} color={reviewed ? '#276359' : '#94a3b8'} />
              </View>
              <View>
                <Text className="text-slate-900">Revision Done</Text>
                <Text className="text-slate-400 text-[10px]">Verified previous 5 pages</Text>
              </View>
            </View>
            <Switch value={reviewed} onValueChange={setReviewed} />
          </View>

          <View className="mb-8">
            <Text className="text-slate-900 text-base mb-4 ml-1">How did it go?</Text>
            <View className="flex-row justify-between">
              <StatusTab
                label="Completed"
                icon="checkmark-circle"
                active={status === "completed"}
                onPress={() => handleStatusSelection("completed")}
              />
              <StatusTab
                label="Partial"
                icon="contrast"
                active={status === "partial"}
                onPress={() => handleStatusSelection("partial")}
              />
              <StatusTab
                label="Missed"
                icon="close-circle"
                active={status === "missed"}
                onPress={() => handleStatusSelection("missed")}
              />
            </View>
          </View>

          {status !== "missed" && (
            <View className="mb-8">
              <Text className="text-slate-900 text-base mb-4 ml-1">Reading Quality</Text>
              <View className="flex-row gap-4">
                <View className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                    <Text className="text-slate-700 text-xs">Mistakes</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Pressable 
                      onPress={() => setMistakes(Math.max(0, mistakes - 1))}
                      className="w-8 h-8 items-center justify-center bg-slate-50 rounded-lg active:bg-slate-100"
                    >
                      <Ionicons name="remove" size={16} color="#64748b" />
                    </Pressable>
                    <Text className="text-lg text-slate-900">{mistakes}</Text>
                    <Pressable 
                      onPress={() => setMistakes(mistakes + 1)}
                      className="w-8 h-8 items-center justify-center bg-slate-50 rounded-lg active:bg-slate-100"
                    >
                      <Ionicons name="add" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>

                <View className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="timer-outline" size={16} color="#eab308" />
                    <Text className="text-slate-700 text-xs">Hesitations</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Pressable 
                      onPress={() => setHesitations(Math.max(0, hesitations - 1))}
                      className="w-8 h-8 items-center justify-center bg-slate-50 rounded-lg active:bg-slate-100"
                    >
                      <Ionicons name="remove" size={16} color="#64748b" />
                    </Pressable>
                    <Text className="text-lg text-slate-900">{hesitations}</Text>
                    <Pressable 
                      onPress={() => setHesitations(hesitations + 1)}
                      className="w-8 h-8 items-center justify-center bg-slate-50 rounded-lg active:bg-slate-100"
                    >
                      <Ionicons name="add" size={16} color="#eab308" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 5. Progress Adjustment & Notes */}
          <View className="mb-8">
            <Text className="text-slate-900 text-base mb-4 ml-1">Actual Progress</Text>
            <View className="bg-white border border-slate-100 p-5 rounded-3xl">
              <View className="flex-row items-center justify-between mb-6">
                <View>
                  <Text className="text-slate-900">Pages Completed</Text>
                  <Text className="text-slate-400 text-[10px]">Adjust if you did more/less</Text>
                </View>
                <View className="flex-row items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <Pressable
                    onPress={() => setPages((prev) => Math.max(0, prev - 1))}
                    className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                  >
                    <Ionicons name="remove" size={18} color="#276359" />
                  </Pressable>
                  <Text className="text-xl text-slate-900 px-4">{pages}</Text>
                  <Pressable
                    onPress={() => setPages((prev) => prev + 1)}
                    className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                  >
                    <Ionicons name="add" size={18} color="#276359" />
                  </Pressable>
                </View>
              </View>

              <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 ml-1">Notes & Reflection</Text>
              <TextInput
                multiline
                placeholder="Specific difficulties or ayahs to focus on?"
                placeholderTextColor="#cbd5e1"
                value={notes}
                onChangeText={setNotes}
                className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 h-24 text-slate-900 text-sm"
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScreenContent>
        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isAddingHifz || isLoggingRetention}
            className="bg-primary h-14 rounded-2xl shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-white text-base mr-2">Save Progress</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </Button>
        </ScreenFooter>
        <Alert
          visible={errorVisible}
          type="delete"
          title="Action Failed"
          message={errorMessage}
          confirmText="Try Again"
          cancelText="Close"
          onConfirm={() => {
            setErrorVisible(false);
          }}
          onCancel={() => setErrorVisible(false)}
        />
      </Screen>
    </>
  );
}
