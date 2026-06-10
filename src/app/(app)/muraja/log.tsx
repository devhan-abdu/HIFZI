import { LogPageSkeleton } from "@/src/features/muraja/components/skeletons";
import { Button } from "@/src/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useWeeklyMuraja } from "@/src/features/muraja/hooks/useWeeklyMuraja";
import { murajaService } from "@/src/features/muraja/services/murajaService";
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
import { useSession } from "@/src/hooks/useSession";

type StatusType = "pending" | "completed" | "partial" | "missed";

export default function LogPage() {
  const router = useRouter();
  const { user } = useSession();

  const { weeklyPlan, todayTask, loading } = useWeeklyMuraja();
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();
  const { getPlanState } = usePlanLifecycle();
  const { items } = useLoadSurahData();

  const planState = getPlanState(weeklyPlan?.id, "MURAJA");
  const isLocked = planState === "EVALUATION_DUE" || planState === "COMPLETION_DUE";

  const isRestDay = !todayTask || todayTask.isVirtualTask;
  const hasExistingProgress = todayTask && (todayTask.completedPages ?? 0) > 0;

  const [status, setStatus] = useState<StatusType>("pending");
  const [pages, setPages] = useState<number>(0);
  const [min, setMin] = useState("");
  const [note, setNote] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [error, setError] = useState("");
  const [rangeError, setRangeError] = useState("");

  const [sessionMode, setSessionMode] = useState<"append" | "overwrite">("append");
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [startSurah, setStartSurah] = useState<number>(1);
  const [startPage, setStartPage] = useState<number>(1);
  const [endSurah, setEndSurah] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);

  // Helper: recalculate pages count from current range
  const recalcPages = (sp: number, ep: number) => Math.max(0, ep - sp + 1);

  // Initialize from todayTask
  useEffect(() => {
    if (todayTask && items.length > 0) {
      const startSurahNum =
        items.find((s) => s.englishName === todayTask.startSurah)?.number || 1;
      const endSurahNum =
        items.find((s) => s.englishName === todayTask.endSurah)?.number || 1;

      setStartSurah(startSurahNum);
      setStartPage(todayTask.startPage || 1);
      setEndSurah(endSurahNum);
      setEndPage(todayTask.endPage || 1);

      const targetPages = todayTask.endPage - todayTask.startPage + 1;

      // Always init pages to target volume so stepper reflects the correct range
      setPages(targetPages);
      if (hasExistingProgress) {
        setStatus("completed");
      } else {
        setStatus(todayTask.status || "pending");
      }
      setMin(weeklyPlan?.estimated_time_min?.toString() || "");
    } else if (!todayTask) {
      setStatus("completed");
    }
  }, [todayTask, weeklyPlan, items]);

  const handleStatusSelection = (
    selectedStatus: StatusType,
  ) => {
    setStatus(selectedStatus);
    const targetPages = todayTask ? todayTask.endPage - todayTask.startPage + 1 : 1;

    if (selectedStatus === "completed") {
      setPages(targetPages);
    } else if (selectedStatus === "missed") {
      setPages(0);
    } else {
      setPages(Math.max(1, Math.floor(targetPages / 2)));
    }
  };

  // Sync status based on pages count
  useEffect(() => {
    if (showCustomRange || !todayTask) return;
    const targetPages = todayTask.endPage - todayTask.startPage + 1;
    if (targetPages <= 0) return;

    if (pages >= targetPages) {
      setStatus("completed");
    } else if (pages === 0) {
      setStatus("missed");
    } else {
      setStatus("partial");
    }
  }, [showCustomRange, todayTask, pages]);

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
    setRangeError("");

    // Range sanity check
    if (endPage < startPage) {
      setRangeError("End page must be greater than or equal to start page.");
      return;
    }

    // If no custom range, user must pick a status
    if (!showCustomRange && status === "pending") {
      setError("Please select a status.");
      return;
    }

    try {
      const isMissed = status === "missed" && !showCustomRange;

      // Planned target range
      const planStart = todayTask?.startPage ?? startPage;
      const planEnd = todayTask?.endPage ?? endPage;

      let finalStartPage = startPage;
      let finalEndPage = endPage;
      let finalPages = pages;
      let finalStatus: StatusType = status;

      if (isMissed) {
        finalStartPage = planStart;
        finalEndPage = planEnd;
        finalPages = 0;
      } else if (!showCustomRange) {
        finalStartPage = hasExistingProgress && sessionMode === "append" ? todayTask.startPage : startPage;
        finalPages = hasExistingProgress && sessionMode === "append" ? todayTask.completedPages + pages : pages;
      }

      if (showCustomRange && !isMissed) {
        // Calculate Intersection
        const custom_start = startPage;
        const custom_end = endPage;
        
        const intersect_start = Math.max(custom_start, planStart);
        const intersect_end = Math.min(custom_end, planEnd);
        // Only count as overlap if the custom range starts from the beginning of the plan target
        const has_overlap = custom_start <= planStart && intersect_start <= intersect_end;

        const quality_score = PerformanceService.deriveQualityScore(mistakes, hesitations);
        const actual_time_min = Number(min) || 0;

        if (!has_overlap) {
          // Case 1: No overlap -> log entirely as extra session
          await murajaService.logExtraSession(
            user?.id ?? "",
            todayStr,
            custom_start,
            custom_end,
            custom_end - custom_start + 1,
            actual_time_min,
            mistakes,
            hesitations,
            quality_score
          );
        } else {
          // Case 2: Overlap -> Write only intersecting pages to Muraja log
          const intersect_pages = intersect_end - intersect_start + 1;
          
          const coversPlanStart = intersect_start <= planStart;
          const coversPlanEnd = intersect_end >= planEnd;
          
          if (coversPlanStart && coversPlanEnd) {
             finalStatus = "completed";
          } else {
             // Only update to partial if we aren't already completed
             if (todayTask?.status !== "completed") {
                finalStatus = "partial";
             } else {
                finalStatus = "completed";
             }
          }

          const existingCompleted = hasExistingProgress && sessionMode === "append" ? todayTask.completedPages : 0;
          const intersectionTotalPages = existingCompleted + intersect_pages;
          const intersectionFinalStart = hasExistingProgress && sessionMode === "append" ? todayTask.startPage : intersect_start;

          await updateLog({
            plan_id: weeklyPlan?.id,
            date: todayStr,
            start_page: intersectionFinalStart,
            end_page: intersect_end,
            completed_pages: intersectionTotalPages,
            actual_time_min: actual_time_min,
            status: finalStatus,
            is_catchup: (todayTask?.isCatchup || intersect_end > planEnd) ? 1 : 0,
            sync_status: 0,
            remote_id: null,
            mistakes_count: mistakes,
            hesitation_count: hesitations,
            quality_score: quality_score,
          });

          // Handle extra parts (outside intersection)
          if (custom_start < intersect_start) {
             await murajaService.logExtraSession(
                user?.id ?? "",
                todayStr,
                custom_start,
                intersect_start - 1,
                intersect_start - custom_start,
                0, // Optional: distribute time or just 0
                0, 0, quality_score
             );
          }
          if (custom_end > intersect_end) {
             await murajaService.logExtraSession(
                user?.id ?? "",
                todayStr,
                intersect_end + 1,
                custom_end,
                custom_end - intersect_end,
                0,
                0, 0, quality_score
             );
          }
        }
      } else {
        // Standard logging (no custom range)
        await updateLog({
          plan_id: weeklyPlan?.id,
          date: todayStr,
          start_page: finalStartPage,
          end_page: finalEndPage,
          completed_pages: Number(finalPages),
          actual_time_min: Number(min) || 0,
          status: finalStatus,
          is_catchup: (todayTask?.isCatchup || finalEndPage > planEnd) ? 1 : 0,
          sync_status: 0,
          remote_id: null,
          mistakes_count: mistakes,
          hesitation_count: hesitations,
          quality_score: PerformanceService.deriveQualityScore(mistakes, hesitations),
        });
      }

      if (isMissed) {
        router.back();
        return;
      }

      showSuccess("Progress Saved", "Your daily muraja has been recorded.", () =>
        router.back()
      );
    } catch (err) {
      showError("Ups!", "Failed to save log");
      console.log(err, "muraja log");
    }
  };

  const showDetails = status !== "missed";

  const getSurahNameByNumber = (num: number) => {
    const found = items.find((s) => s.number === num);
    return found ? found.englishName : "Surah";
  };

  // Hero label: show pages from stepper (updates as user taps +/-)
  const effectiveEndPage = showCustomRange ? endPage : (pages > 0 ? startPage + pages - 1 : startPage);
  const effectiveEndSurah = showCustomRange ? endSurah : (items.find(s => effectiveEndPage >= s.startingPage && effectiveEndPage <= s.endingPage)?.number || startSurah);
  const heroPages = showCustomRange ? recalcPages(startPage, endPage) : pages;

  return (
    <>
      <Screen>
        {/* Header */}
        <View className="bg-white px-4 pt-4 pb-4 flex-row items-center border-b border-slate-50">
          <Pressable
            onPress={() => router.replace("/(app)/muraja")}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>
          <Text className="text-lg text-slate-900 ml-2">{formattedDate}</Text>
        </View>

        <ScreenContent>
          {/* Locked banner */}
          {isLocked && (
            <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-8 flex-row items-center gap-3">
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
              <View className="flex-1">
                <Text className="text-red-900 text-sm">Logging Locked</Text>
                <Text className="text-red-700/70 text-xs">
                  {planState === "EVALUATION_DUE"
                    ? "Please complete your evaluation exam to unlock logging."
                    : "This plan is completed. Start a new plan to resume logging."}
                </Text>
              </View>
            </View>
          )}

          {/* Existing progress / session mode */}
          {hasExistingProgress && !isLocked && (
            <View className="mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <View className="flex-row items-center gap-3 mb-3">
                <Ionicons name="information-circle" size={20} color="#276359" />
                <Text className="text-primary text-sm">
                  Today's Progress: {todayTask.completedPages} pages logged
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setSessionMode("append")}
                  className={`flex-1 py-3 px-3 rounded-xl border ${
                    sessionMode === "append"
                      ? "bg-primary border-primary"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-center text-xs ${
                      sessionMode === "append" ? "text-white" : "text-slate-600"
                    }`}
                  >
                    Add (Continue)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSessionMode("overwrite")}
                  className={`flex-1 py-3 px-3 rounded-xl border ${
                    sessionMode === "overwrite"
                      ? "bg-primary border-primary"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-center text-xs ${
                      sessionMode === "overwrite" ? "text-white" : "text-slate-600"
                    }`}
                  >
                    Overwrite (New)
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Hero card: always synced to current range ── */}
          <View className="bg-primary rounded-3xl p-6 mb-8 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                <Text className="text-white text-[10px] uppercase tracking-[2px]">
                  {isRestDay ? "Next Plan" : "Study Target"}
                </Text>
              </View>
              <Text className="text-white/60 text-[10px] uppercase tracking-widest">
                Muraja
              </Text>
            </View>

            <View className="flex-row items-end justify-between">
              <View className="flex-1">
                <Text className="text-white text-2xl tracking-tighter">
                  {startSurah === effectiveEndSurah
                    ? getSurahNameByNumber(startSurah)
                    : `${getSurahNameByNumber(startSurah)} – ${getSurahNameByNumber(effectiveEndSurah)}`}
                </Text>
                <Text className="text-white/50 text-xs mt-1">
                  {isRestDay
                    ? `Next session: ${pages > 0 ? `Pages ${startPage}–${effectiveEndPage}` : `Page ${startPage}`}`
                    : pages > 0 ? `Pages ${startPage}–${effectiveEndPage}` : `Page ${startPage}`}
                </Text>
              </View>
              <View className="items-end">
                <View className="flex-row items-baseline">
                  <Text className="text-white text-2xl tracking-tighter">
                    {heroPages}
                  </Text>
                  <Text className="text-white/40 text-sm ml-1">Pgs</Text>
                </View>
                <Text className="text-white/40 text-[9px] uppercase tracking-widest">
                  {showCustomRange ? "Custom Range" : "Target Volume"}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Custom Range toggle ── */}
          {!isLocked && (
            <View className="mb-8">
              {!showCustomRange ? (
                <Pressable
                  onPress={() => setShowCustomRange(true)}
                  className="flex-row items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-4 rounded-2xl active:bg-slate-100"
                >
                  <Ionicons name="options-outline" size={20} color="#64748b" />
                  <Text className="text-slate-600">Add Custom Range</Text>
                </Pressable>
              ) : (
                <View className="p-5 rounded-3xl border border-slate-100 bg-white shadow-sm gap-y-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-slate-900 text-base ml-1">Study Range</Text>
                    <Pressable
                      onPress={() => {
                        setShowCustomRange(false);
                        setRangeError("");
                        // Reset to task defaults
                        if (todayTask) {
                          const sn =
                            items.find((s) => s.englishName === todayTask.startSurah)?.number || 1;
                          const en =
                            items.find((s) => s.englishName === todayTask.endSurah)?.number || 1;
                          setStartSurah(sn);
                          setStartPage(todayTask.startPage || 1);
                          setEndSurah(en);
                          setEndPage(todayTask.endPage || 1);
                          setPages(recalcPages(todayTask.startPage, todayTask.endPage));
                        }
                      }}
                      className="p-1"
                    >
                      <Ionicons name="close" size={20} color="#64748b" />
                    </Pressable>
                  </View>

                  <SurahDropdown
                    label="Start Surah"
                    surah={startSurah}
                    setSurah={(newSurah) => {
                      const surahFound = items.find((s) => s.number === newSurah);
                      const newStartPage = surahFound?.startingPage ?? startPage;
                      setStartSurah(newSurah);
                      setStartPage(newStartPage);
                      if (newSurah > endSurah) {
                        setEndSurah(newSurah);
                        setEndPage(newStartPage);
                        setPages(1);
                        setRangeError("");
                      } else {
                        const p = recalcPages(newStartPage, endPage);
                        setPages(p);
                        setRangeError(newStartPage > endPage ? "End page must be ≥ start page." : "");
                      }
                    }}
                  />

                  <SurahPageDropdown
                    label="Start Page"
                    surah={startSurah}
                    page={startPage}
                    setPage={(newPage) => {
                      setStartPage(newPage);
                      if (newPage > endPage) {
                        setRangeError("End page must be ≥ start page.");
                        setPages(0);
                      } else {
                        setRangeError("");
                        setPages(recalcPages(newPage, endPage));
                      }
                    }}
                  />

                  <View className="h-[1px] bg-slate-100 my-2" />

                  <SurahDropdown
                    label="End Surah"
                    surah={endSurah}
                    setSurah={(newSurah) => {
                      const surahFound = items.find((s) => s.number === newSurah);
                      const newEndPage = surahFound?.startingPage ?? endPage;
                      setEndSurah(newSurah);
                      setEndPage(newEndPage);
                      if (newEndPage < startPage) {
                        setRangeError("End page must be ≥ start page.");
                        setPages(0);
                      } else {
                        setRangeError("");
                        setPages(recalcPages(startPage, newEndPage));
                      }
                    }}
                  />

                  <SurahPageDropdown
                    label="End Page"
                    surah={endSurah}
                    page={endPage}
                    setPage={(newPage) => {
                      setEndPage(newPage);
                      if (newPage < startPage) {
                        setRangeError("End page must be ≥ start page.");
                        setPages(0);
                      } else {
                        setRangeError("");
                        setPages(recalcPages(startPage, newPage));
                      }
                    }}
                  />

                  {rangeError ? (
                    <View className="flex-row items-center gap-2 bg-red-50 border border-red-100 px-4 py-3 rounded-xl mt-1">
                      <Ionicons name="warning-outline" size={16} color="#ef4444" />
                      <Text className="text-red-500 text-xs flex-1">{rangeError}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* ── Status Selection — hidden when custom range is open ── */}
          {!isLocked && !showCustomRange && (
            <View className="mb-8">
              <Text className="text-slate-900 text-base mb-4 ml-1">How did it go?</Text>
              <View className="flex-row justify-between">
                <StatusTab
                  label="Completed"
                  icon="checkmark-circle"
                  active={status === "completed"}
                  onPress={() => {
                    setStatus("completed");
                    setPages(recalcPages(startPage, endPage));
                  }}
                />
                <StatusTab
                  label="Partial"
                  icon="contrast"
                  active={status === "partial"}
                  onPress={() => {
                    setStatus("partial");
                    setPages(Math.max(1, Math.floor(recalcPages(startPage, endPage) / 2)));
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

          {/* ── Quality Metrics ── */}
          {showDetails && !isLocked && !showCustomRange && (
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

          {/* ── Pages stepper + time + notes ── */}
          {!isLocked && (
            <View className="mb-8">
              <Text className="text-slate-900 text-base mb-4 ml-1">Actual Progress</Text>
              <View className="bg-white border border-slate-100 p-5 rounded-3xl">
                {/* Pages stepper */}
                <View className="flex-row items-center justify-between mb-6">
                  <View>
                    <Text className="text-slate-900">Pages Completed</Text>
                    <Text className="text-slate-400 text-[10px]">
                      {showCustomRange
                        ? `Range: ${startPage}–${endPage}`
                        : "Adjust if you did more/less"}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                    <Pressable
                      onPress={() => {
                        const newPages = Math.max(0, pages - 1);
                        setPages(newPages);
                        if (!showCustomRange) {
                          if (newPages === 0) setStatus("missed");
                          else if (status === "completed") setStatus("partial");
                        }
                      }}
                      className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                    >
                      <Ionicons name="remove" size={18} color="#276359" />
                    </Pressable>
                    <Text className="text-xl text-slate-900 px-4">{heroPages}</Text>
                    <Pressable
                      onPress={() => {
                        const newPages = pages + 1;
                        setPages(newPages);
                        if (!showCustomRange && status === "missed") setStatus("partial");
                      }}
                      className="w-9 h-9 items-center justify-center active:bg-white rounded-lg"
                    >
                      <Ionicons name="add" size={18} color="#276359" />
                    </Pressable>
                  </View>
                </View>

                {/* Time */}
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

                {/* Notes */}
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

              {/* Errors */}
              {error ? (
                <Text className="text-red-500 mt-4 text-center text-xs">{error}</Text>
              ) : null}
            </View>
          )}
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isUpdating || isLocked || !!rangeError}
            className={`h-14 rounded-2xl shadow-sm ${rangeError ? "bg-slate-300" : "bg-primary"}`}
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
