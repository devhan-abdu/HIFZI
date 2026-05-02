import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useAddLog } from "@/src/features/hifz/hooks/useAddLog";
import { useSession } from "@/src/hooks/useSession";
import { Button } from "@/src/components/ui/Button";
import { IHifzLog } from "@/src/features/hifz/types";
import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Alert } from "@/src/components/common/Alert";
import { LogProgressSkeleton } from "@/src/features/hifz/components/skeleton";
import { Switch } from "@/src/features/hifz/components/Switch";
import { getTodayTask } from "@/src/features/hifz/utils/quran-logic";
import { QualityCounter } from "@/src/components/common/QualityCounter";
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
  const { addLog, isCreating } = useAddLog();

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
    if (!plan || isCreating || !plan.id)
      return;

    try {
      const today = new Date();
      const logDay = (today.getDay() + 6) % 7;
      const actualTask = getTodayTask(plan, surahData, pages);
      const actualStartPage =
        hasReviewPrefill ? reviewStartPage
        : logContext?.startPage ?? plan.start_page;
      const actualEndPage =
        hasReviewPrefill ? reviewStartPage + Math.max(0, pages - 1)
        : actualTask?.endPage ?? actualStartPage;

      const payload: IHifzLog = {
        hifz_plan_id: plan.id,
        actual_pages_completed: pages,
        actual_start_page: actualStartPage,
        actual_end_page: actualEndPage,
        status,
        date: today.toISOString().slice(0, 10),
        log_day: logDay,
        notes: notes.trim(),
        mistakes_count: mistakes,
        hesitation_count: hesitations,
      };

      await addLog({ todayLog: payload, userId: user?.id });
      router.back();
    } catch (err: any) {
      setErrorMessage(err.message);
      setErrorVisible(true);
    }
  };

  return (
    <>
      <View className="bg-white px-4 pt-12 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.replace("/(app)/hifz")}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl  text-slate-900 leading-tight ml-2">
          Log Progress
        </Text>
      </View>
      <Screen>
        <ScreenContent>
          <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-2xl shadow-primary/40 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-1">
                <Text className="text-white/60 uppercase tracking-[2px] text-[10px] mb-1">
                  {hasReviewPrefill ? "Revision Session" : 
                   logContext?.isPlannedDay ? "Scheduled Session" : "Extra Session"}
                </Text>
                <Text className="text-white text-3xl tracking-tighter">
                  {hasReviewPrefill ? "Targeted Review" : logContext?.displaySurah}
                </Text>
              </View>
              <View className="bg-white/20 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-white text-[9px]  uppercase tracking-widest">
                  {hasReviewPrefill ? `Cycle ${params.reviewCycleDay ?? "1"}` : plan.direction}
                </Text>
              </View>
            </View>

            <View className="w-full h-[2px] bg-white/10 rounded-full mb-8 overflow-hidden" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white text-2xl tracking-tight leading-7">
                  {pages}
                  <Text className="text-white/50 text-xl"> Pgs</Text>
                </Text>
                <Text className="text-white/40 text-[9px] uppercase tracking-widest mt-1">
                  Daily Goal
                </Text>
              </View>
              
              <View className="h-8 w-px bg-white/10 mx-6" />

              <View className="flex-1">
                <Text className="text-white text-lg tracking-tight leading-6">
                  {hasReviewPrefill ? reviewStartPage : (logContext?.startPage ?? 0)} —{" "}
                  {hasReviewPrefill ? reviewEndPage : (logContext?.endPage ?? 0)}
                </Text>
                <Text className="text-white/40 text-[9px] uppercase tracking-widest mt-1">
                  {hasReviewPrefill ? "Review Range" : `Juz ${logContext?.juz ?? "-"}`}
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white border border-slate-100 p-5 rounded-[32px] mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-slate-900 text-lg ">Revision Done</Text>
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">
                Last 5 pages revised
              </Text>
            </View>
            <Switch value={reviewed} onValueChange={setReviewed} />
          </View>

          <Text className="text-xl  text-gray-900 mb-4">How did it go?</Text>
          <View className="flex-row justify-between mb-8">
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

          {status !== "missed" && (
            <View className="mb-8 p-5 bg-slate-50 rounded-[32px] border border-slate-100 gap-y-4">
              <QualityCounter
                label="Mistakes"
                description="Incorrect words or tajweed"
                value={mistakes}
                onValueChange={setMistakes}
                icon="alert-circle-outline"
                color="#276359"
              />
              <QualityCounter
                label="Hesitations"
                description="Long pauses or unsureness"
                value={hesitations}
                onValueChange={setHesitations}
                icon="timer-outline"
                color="#276359"
              />
            </View>
          )}

          <View className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-8">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className=" text-slate-900 text-lg">Pages Memorized</Text>
                <Text className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">
                  Actual progress
                </Text>
              </View>
              <View className="flex-row items-center bg-white rounded-2xl p-1 border border-slate-200">
                <Pressable
                  onPress={() => setPages((prev) => Math.max(0, prev - 1))}
                  className="w-10 h-10 items-center justify-center active:bg-slate-50 rounded-xl"
                >
                  <Ionicons name="remove" size={20} color="#276359" />
                </Pressable>
                <Text className="text-2xl  text-slate-900 px-4">{pages}</Text>
                <Pressable
                  onPress={() => setPages((prev) => prev + 1)}
                  className="w-10 h-10 items-center justify-center active:bg-slate-50 rounded-xl"
                >
                  <Ionicons name="add" size={20} color="#276359" />
                </Pressable>
              </View>
            </View>

            <Text className="text-slate-400 uppercase text-[10px] mb-2 ml-1 tracking-widest">
              Reflection or Notes
            </Text>
            <TextInput
              multiline
              placeholder="Difficulties with specific ayahs?"
              placeholderTextColor="#94a3b8"
              value={notes}
              onChangeText={setNotes}
              className="bg-white p-5 rounded-[24px] border border-slate-100 h-32 text-slate-900"
              textAlignVertical="top"
            />
          </View>
        </ScreenContent>
        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isCreating}
            className="bg-primary h-14  shadow-lg shadow-primary/30"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-white  text-lg mr-2">Save Progress</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
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
