import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useHifzDailyTask } from "@/src/features/hifz/hooks/useHifzDailyTask";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useAddLog } from "@/src/features/hifz/hook/useAddLog";
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

  if (!logContext && !hasReviewPrefill) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="cafe-outline" size={48} color="#276359" />
          <Text className="text-xl  text-slate-900 mt-4">Rest Day</Text>
          <Text className="text-slate-500 text-center mt-2">
            No task scheduled for today. Take a moment to revise!
          </Text>
          <Button className="mt-6" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

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
      <View className="bg-white border-b border-slate-100">
        <View className="h-16 px-4 flex-row items-center">
          <Pressable
            onPress={() => router.replace("/(app)/hifz")}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>
          <Text className="text-lg  text-primary leading-tight ml-2">
            Log Progress
          </Text>
        </View>
      </View>
      <Screen>
        <ScreenContent>
          <View className="bg-primary p-6 rounded-[40px] mb-8 shadow-xl shadow-green-900/20">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <Text className="text-white/70   text-[10px] uppercase tracking-[2px]">
                  {logContext?.isPlannedDay ?
                    "Scheduled Session"
                  : "Recovery Session"}
                </Text>
              </View>
              <View className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-white text-[9px]  uppercase tracking-widest">
                  {hasReviewPrefill ? `Review C${params.reviewCycleDay ?? "1"}` : plan.direction}
                </Text>
              </View>
            </View>

            <Text className="text-white text-3xl  mb-6 tracking-tight">
              {hasReviewPrefill ? "Targeted Review Session" : logContext?.displaySurah}
            </Text>

            <View className="bg-black/10 rounded-3xl p-5 border border-white/5">
              <View className="flex-row justify-between items-end mb-1">
                <View>
                  <Text className="text-white text-4xl ">
                    {pages}
                    <Text className="text-white/50 text-xl "> Pages</Text>
                  </Text>
                  <Text className="text-white/40 text-[9px]   uppercase tracking-widest mt-1">
                    Goal for today
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white   text-sm">
                    {hasReviewPrefill ? reviewStartPage : (logContext?.startPage ?? 0)} —{" "}
                    {hasReviewPrefill ? reviewEndPage : (logContext?.endPage ?? 0)}
                  </Text>
                  <Text className="text-white/40 text-[9px]   uppercase tracking-widest mt-1">
                    {hasReviewPrefill ?
                      "Suggested from spaced repetition"
                    : `Range (Juz ${logContext?.juz ?? "-"})`}
                  </Text>
                </View>
              </View>

              {!hasReviewPrefill && (
                <View className="flex-row mt-4 gap-x-5">
                  {(logContext?.baseTarget ?? 0) > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                    <Text className="text-white/60 text-[9px]   uppercase">
                        Daily: {logContext?.baseTarget}
                    </Text>
                  </View>
                  )}
                  {(logContext?.catchUpAmount ?? 0) > 0 && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
                    <Text className="text-white/60 text-[9px]   uppercase">
                        Extra: {logContext?.catchUpAmount}
                    </Text>
                  </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View className="bg-white border border-slate-100 p-6 rounded-[32px] mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Ionicons
                  name="library-outline"
                  size={18}
                  color="#276359"
                  className="mr-2"
                />
                <Text className="text-[#0f172a] text-lg  ml-2">Revision</Text>
              </View>
              <Text className="text-slate-500 text-xs">
                Revise last 5 pages before memorizing
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
            <View className="mb-8 gap-y-4">
              <QualityCounter
                label="Mistakes"
                description="Incorrect words or tajweed"
                value={mistakes}
                onValueChange={setMistakes}
                icon="alert-circle"
                color="#ef4444"
              />
              <QualityCounter
                label="Hesitations"
                description="Long pauses or unsureness"
                value={hesitations}
                onValueChange={setHesitations}
                icon="timer"
                color="#f59e0b"
              />
            </View>
          )}

          <View className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 flex-row items-center justify-between mb-8">
            <View>
              <Text className=" text-gray-900 text-lg">Pages Memorized</Text>
              <Text className="text-gray-400 text-xs ">
                Actual progress today
              </Text>
            </View>
            <View className="flex-row items-center bg-white rounded-2xl p-1.5 border border-gray-200">
              <Pressable
                onPress={() => setPages((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
              >
                <Ionicons name="remove" size={20} color="#276359" />
              </Pressable>
              <Text className="text-2xl  text-gray-900 px-4">{pages}</Text>
              <Pressable
                onPress={() => setPages((prev) => prev + 1)}
                className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
              >
                <Ionicons name="add" size={20} color="#276359" />
              </Pressable>
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-gray-400   uppercase text-[10px] mb-2 ml-1 tracking-widest">
              Reflection or Notes
            </Text>
            <TextInput
              multiline
              placeholder="Difficulties with specific ayahs?"
              placeholderTextColor="#9ca3af"
              value={notes}
              onChangeText={setNotes}
              className="bg-gray-50 p-5 rounded-[28px] border border-gray-100 h-32 text-gray-900 "
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
