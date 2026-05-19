import { LogPageSkeleton } from "@/src/features/muraja/components/skeletons";
import { Button } from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import Screen from "@/src/components/screen/Screen";
import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";
import { PerformanceService } from "@/src/services/PerformanceService";
import { usePlanLifecycle } from "@/src/features/habits/hooks/usePlanLifecycle";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import SurahDropdown, {
  SurahPageDropdown,
} from "@/src/features/muraja/components/SurahDropdown";

type StatusType = "pending" | "completed" | "partial" | "missed";

export default function LogPage() {
  const router = useRouter();

  const { weeklyPlan, todayTask, loading } = useWeeklyMuraja();
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();
  const { getPlanState } = usePlanLifecycle();
  const { items } = useLoadSurahData();

  const planState = getPlanState(weeklyPlan?.id, 'MURAJA');
  const isLocked = planState === 'EVALUATION_DUE' || planState === 'COMPLETION_DUE';

  const [status, setStatus] = useState<StatusType>("pending");
  const [pages, setPages] = useState<number>(weeklyPlan?.planned_pages_per_day || 1);
  const [min, setMin] = useState("");
  const [note, setNote] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [error, setError] = useState("");

  // Rest Day state variables for voluntary logging
  const [startSurah, setStartSurah] = useState<number>(1);
  const [startPage, setStartPage] = useState<number>(1);
  const [endSurah, setEndSurah] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);

  const isRestDay = !todayTask || todayTask.isVirtualTask;

  useEffect(() => {
    if (todayTask) {
      setPages(todayTask.completedPages);
      setStatus(todayTask.status);
      setMin(weeklyPlan?.estimated_time_min?.toString() || "");
    } else {
      setStatus("completed");
    }
  }, [todayTask, weeklyPlan]);

  // Sync rest day pages count
  useEffect(() => {
    if (isRestDay) {
      setPages(Math.max(1, endPage - startPage + 1));
    }
  }, [startPage, endPage, isRestDay]);

  // Handle dropdown selection bounds
  useEffect(() => {
    if (isRestDay && items.length > 0) {
      const startFound = items.find(s => s.number === startSurah);
      if (startFound) {
        setStartPage(startFound.startingPage);
      }
    }
  }, [startSurah, isRestDay, items]);

  useEffect(() => {
    if (isRestDay && items.length > 0) {
      const endFound = items.find(s => s.number === endSurah);
      if (endFound) {
        setEndPage(endFound.startingPage);
      }
    }
  }, [endSurah, isRestDay, items]);

  useEffect(() => {
    if (startSurah > endSurah) {
      setEndSurah(startSurah);
    }
  }, [startSurah]);

  useEffect(() => {
    if (startPage > endPage) {
      setEndPage(startPage);
    }
  }, [startPage]);

  if (loading) return <LogPageSkeleton />;
  if (!weeklyPlan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-gray-500 text-center">
            No active plan found. Please create a plan first.
          </Text>
          <Button onPress={() => router.replace("/(app)/muraja")} className="mt-4">
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const handleSave = async () => {
    setError("");

    if (status === "pending") {
      setError("please select the status");
      return;
    }

    try {
      await updateLog({
        plan_id: weeklyPlan?.id,
        date: todayStr,
        start_page: isRestDay ? startPage : (todayTask?.startPage ?? weeklyPlan.planned_pages_per_day ?? 1),
        end_page: isRestDay ? endPage : (status === "completed" ? todayTask?.endPage : todayTask?.startPage),
        completed_pages: Number(pages),
        actual_time_min: Number(min) || 0,
        status: status,
        is_catchup: todayTask?.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
        mistakes_count: mistakes,
        hesitation_count: hesitations,
        quality_score: PerformanceService.deriveQualityScore(mistakes, hesitations),
      });

      if (status === "missed") {
        router.back();
        return;
      }

      const title = todayTask?.isCatchup ? "Caught Up!" : "Progress Saved";
      const message =
        todayTask?.isCatchup ?
          "MashaAllah! You've cleared your debt."
        : "Your daily muraja has been recorded.";

      showSuccess(title, message, () => router.back());
    } catch (err) {
      showError("Ups!", "Failed to save log");
      console.log(err, "muraja log");
    }
  };

  const showDetails = status !== "missed";

  const getSurahNameByNumber = (num: number) => {
    const found = items.find(s => s.number === num);
    return found ? found.englishName : "Surah";
  };

  return (
    <>
      <Screen>
        <View className="bg-white px-4 pt-4 pb-4 flex-row items-center border-b border-slate-50">
          <Pressable
            onPress={() => router.replace("/(app)/muraja")}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>
          <Text className="text-lg text-slate-900 ml-2">
            {formattedDate}
          </Text>
        </View>

        <ScreenContent>
          {isLocked && (
            <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-8 flex-row items-center gap-3">
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
              <View className="flex-1">
                <Text className="text-red-900 text-sm">Logging Locked</Text>
                <Text className="text-red-700/70 text-xs">
                  {planState === 'EVALUATION_DUE' 
                    ? "Please complete your evaluation exam to unlock logging." 
                    : "This plan is completed. Start a new plan to resume logging."}
                </Text>
              </View>
            </View>
          )}

          {todayTask?.isCatchup && (
            <View className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mb-8 flex-row items-center gap-3">
              <Ionicons name="refresh-circle" size={24} color="#f97316" />
              <View className="flex-1">
                <Text className="text-orange-900  text-sm">Catch-Up Mode</Text>
                <Text className="text-orange-700/70 text-xs">
                  Completing missed pages to stay on track
                </Text>
              </View>
            </View>
          )}

          <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-xl shadow-primary/30 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Text className="text-white text-[10px] uppercase tracking-[2px]">
                  {isRestDay ? "Extra Session" : "Today's Target"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {todayTask?.isCatchup && (
                  <View className="bg-orange-400 px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[9px] uppercase">Catchup</Text>
                  </View>
                )}
                <Text className="text-white/60 text-[10px] uppercase tracking-widest">Muraja</Text>
              </View>
            </View>

            <View className="flex-row items-end justify-between">
              <View className="flex-1">
                <Text className="text-white text-3xl tracking-tighter">
                  {isRestDay ? (
                    startSurah === endSurah ?
                      getSurahNameByNumber(startSurah)
                    : `${getSurahNameByNumber(startSurah)} – ${getSurahNameByNumber(endSurah)}`
                  ) : todayTask ? (
                    todayTask.startSurah === todayTask.endSurah ?
                      todayTask.startSurah
                    : `${todayTask.startSurah} – ${todayTask.endSurah}`
                  ) : "Extra Revision"}
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  Range: {isRestDay ? `${startPage}—${endPage}` : todayTask ? `${todayTask.startPage}—${todayTask.endPage}` : "Extra"}
                </Text>
              </View>
              <View className="items-end">
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl tracking-tighter">
                    {isRestDay ? `${endPage - startPage + 1}` : todayTask ? `${todayTask.endPage - todayTask.startPage + 1}` : "0"}
                  </Text>
                  <Text className="text-white/40 text-sm ml-1">Pgs</Text>
                </View>
                <Text className="text-white/40 text-[9px] uppercase tracking-widest">Target Volume</Text>
              </View>
            </View>
          </View>

          {/* Rest Day Voluntary Dropdowns */}
          {isRestDay && !isLocked && (
            <View className="p-5 mb-8 rounded-[32px] border border-slate-100 bg-white shadow-sm gap-y-4">
              <Text className="text-slate-900 text-base mb-2 ml-1">Voluntary Study Range</Text>
              
              <SurahDropdown 
                label="Start Surah" 
                surah={startSurah} 
                setSurah={setStartSurah} 
              />
              
              <SurahPageDropdown
                label="Start Page"
                surah={startSurah}
                setPage={setStartPage}
                page={startPage}
              />

              <View className="h-[1px] bg-slate-100 my-2" />

              <SurahDropdown 
                label="End Surah" 
                surah={endSurah} 
                setSurah={setEndSurah} 
              />
              
              <SurahPageDropdown
                label="End Page"
                surah={endSurah}
                setPage={setEndPage}
                page={endPage}
              />
            </View>
          )}

          {/* 3. Status Selection */}
          {!isLocked && !isRestDay && (
            <View className="mb-8">
              <Text className="text-slate-900 text-base mb-4 ml-1">How did it go?</Text>
              <View className="flex-row justify-between">
                <StatusTab
                  label="Completed"
                  icon="checkmark-circle"
                  active={status === "completed"}
                  onPress={() => {
                    setStatus("completed");
                    if (isRestDay) {
                      setPages(endPage - startPage + 1);
                    } else if (todayTask) {
                      setPages(todayTask.endPage - todayTask.startPage + 1);
                    }
                  }}
                />
                <StatusTab
                  label="Partial"
                  icon="contrast"
                  active={status === "partial"}
                  onPress={() => {
                    setStatus("partial");
                    if (isRestDay) {
                      setPages(Math.max(1, Math.floor((endPage - startPage + 1) / 2)));
                    } else if (todayTask) {
                      setPages(
                        Math.floor((todayTask.endPage - todayTask.startPage + 1) / 2),
                      );
                    }
                  }}
                />
                <StatusTab
                  label="Missed"
                  icon="close-circle"
                  active={status === "missed"}
                  onPress={() => {
                    setStatus("missed");
                    setPages(0);
                  }}
                />
              </View>
            </View>
          )}

          {/* 4. Quality Metrics - Inline Design */}
          {showDetails && !isLocked && (
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
          {!isLocked && (
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
                      onPress={() => setPages((p: number) => Math.max(0, p - 1))}
                      className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                    >
                      <Ionicons name="remove" size={18} color="#276359" />
                    </Pressable>
                    <Text className="text-xl text-slate-900 px-4">{pages}</Text>
                    <Pressable
                      onPress={() => setPages((p: number) => p + 1)}
                      className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                    >
                      <Ionicons name="add" size={18} color="#276359" />
                    </Pressable>
                  </View>
                </View>

                {showDetails && (
                  <View className="mb-5">
                    <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 ml-1">
                      Time Spent (min)
                    </Text>
                    <TextInput
                      placeholder="Minutes"
                      placeholderTextColor="#cbd5e1"
                      keyboardType="numeric"
                      value={min}
                      onChangeText={setMin}
                      className="bg-slate-50/50 px-4 h-12 rounded-xl border border-slate-100 text-slate-900 text-sm"
                    />
                  </View>
                )}

                <View>
                  <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 ml-1">
                    Notes & Reflection
                  </Text>
                  <TextInput
                    multiline
                    placeholder="Any specific difficulties?"
                    placeholderTextColor="#cbd5e1"
                    value={note}
                    onChangeText={setNote}
                    className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 h-24 text-slate-900 text-sm"
                    textAlignVertical="top"
                  />
                </View>
              </View>
              {error && (
                <Text className="text-red-500 mt-4 text-center text-xs">{error}</Text>
              )}
            </View>
          )}
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isUpdating || isLocked}
            className="bg-primary h-14 rounded-2xl shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-white text-base mr-2">
                {isLocked ? "Logging Locked" : "Save Progress"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </Button>
        </ScreenFooter>
      </Screen>
      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
}
