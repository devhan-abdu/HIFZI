import { useColorScheme } from "nativewind";
import { LogPageSkeleton } from "@/src/features/muraja/components/skeletons";
import { Button } from "@/src/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useMurajaOperation } from "@/src/features/muraja/hooks/useMurajaOperation";
import { useMurajaCardState } from "@/src/features/muraja/hooks/useMurajaCardState";
import { useMurajaAnalytics } from "@/src/features/muraja/hooks/useMurajaAnalytics";
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
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import SurahDropdown, {
  SurahPageDropdown,
} from "@/src/features/muraja/components/SurahDropdown";
import { useSession } from "@/src/hooks/useSession";
import { LogStudyHero } from "@/src/features/muraja/components/log/LogStudyHero";
import { getLocalDateString } from "@/src/features/muraja/utils/murajaAnalytics";

type StatusType = "pending" | "completed" | "partial" | "missed";

export default function LogPage() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useSession();

  const cardState = useMurajaCardState();
  const analyticsData = useMurajaAnalytics();
  const { weeklyPlan, loading } = analyticsData ?? {};
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();
  const { items } = useLoadSurahData();

  const isLocked =
    cardState.type === "EVALUATION_DUE" || cardState.type === "PLAN_FINISHED";
  const planState =
    cardState.type === "EVALUATION_DUE" ? "EVALUATION_DUE"
    : cardState.type === "PLAN_FINISHED" ? "COMPLETION_DUE"
    : null;

  const todayTask =
    (
      cardState.type === "PLANNED_DAY" ||
      cardState.type === "CATCHUP_DAY" ||
      cardState.type === "COMPLETED_TODAY"
    ) ?
      cardState.task
    : null;

  const isRestDay = !todayTask || todayTask.isVirtualTask;
  const hasExistingProgress = todayTask && (todayTask.completedPages ?? 0) > 0;

  const [form, setForm] = useState({
    status: "pending" as StatusType,
    pages: 0,
    min: "",
    note: "",
    mistakes: 0,
    hesitations: 0,
    error: "",
    rangeError: "",
    sessionMode: "append" as "append" | "overwrite",
    showCustomRange: false,
    startSurah: 1,
    startPage: 1,
    endSurah: 1,
    endPage: 1,
  });

  const updateForm = (updates: Partial<typeof form>) => setForm(f => ({ ...f, ...updates }));

  const { status, pages, min, note, mistakes, hesitations, error, rangeError, sessionMode, showCustomRange, startSurah, startPage, endSurah, endPage } = form;

  const recalcPages = (sp: number, ep: number) => Math.max(0, ep - sp + 1);

  useEffect(() => {
    if (todayTask && items.length > 0) {
      const startSurahNum =
        items.find((s) => s.englishName === todayTask.startSurah)?.number || 1;
      const endSurahNum =
        items.find((s) => s.englishName === todayTask.endSurah)?.number || 1;
      updateForm({
        startSurah: startSurahNum,
        startPage: todayTask.startPage || 1,
        endSurah: endSurahNum,
        endPage: todayTask.endPage || 1,
        pages: todayTask.endPage - todayTask.startPage + 1,
        status: hasExistingProgress ? "completed" : todayTask.status || "pending",
        min: weeklyPlan?.estimated_time_min?.toString() || ""
      });
    } else if (!todayTask) {
      updateForm({ status: "completed" });
    }
  }, [todayTask, weeklyPlan, items]);

  const handleStatusSelection = (selectedStatus: StatusType) => {
    const targetPages =
      todayTask ? todayTask.endPage - todayTask.startPage + 1 : 1;
    updateForm({
      status: selectedStatus,
      pages: selectedStatus === "completed" ? targetPages : selectedStatus === "missed" ? 0 : Math.max(1, Math.floor(targetPages / 2))
    });
  };

  useEffect(() => {
    if (showCustomRange || !todayTask) return;
    const targetPages = todayTask.endPage - todayTask.startPage + 1;
    if (targetPages <= 0) return;
    if (pages >= targetPages) updateForm({ status: "completed" });
    else if (pages === 0) updateForm({ status: "missed" });
    else updateForm({ status: "partial" });
  }, [showCustomRange, todayTask, pages]);

  if (loading) return <LogPageSkeleton />;

  if (!weeklyPlan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-muted text-center">
            No active plan found. Please create a plan first.
          </Text>
          <Button
            onPress={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const todayStr = getLocalDateString(new Date());
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const handleSave = async () => {
    updateForm({ error: "", rangeError: "" });

    if (endPage < startPage) {
      updateForm({ rangeError: "End page must be greater than or equal to start page." });
      return;
    }
    if (!showCustomRange && status === "pending") {
      updateForm({ error: "Please select a status." });
      return;
    }

    try {
      const isMissed = status === "missed" && !showCustomRange;
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
        finalStartPage =
          hasExistingProgress && sessionMode === "append" ?
            todayTask.startPage
          : startPage;
        finalPages =
          hasExistingProgress && sessionMode === "append" ?
            todayTask.completedPages + pages
          : pages;
      }

      if (showCustomRange && !isMissed) {
        const custom_start = startPage;
        const custom_end = endPage;
        const intersect_start = Math.max(custom_start, planStart);
        const intersect_end = Math.min(custom_end, planEnd);
        const has_overlap =
          custom_start <= planStart && intersect_start <= intersect_end;
        const quality_score = PerformanceService.deriveQualityScore(
          mistakes,
          hesitations,
        );
        const actual_time_min = Number(min) || 0;

        if (!has_overlap) {
          await murajaService.logExtraSession(
            user?.id ?? "",
            todayStr,
            custom_start,
            custom_end,
            custom_end - custom_start + 1,
            actual_time_min,
            mistakes,
            hesitations,
            quality_score,
          );
        } else {
          const intersect_pages = intersect_end - intersect_start + 1;
          const coversPlanStart = intersect_start <= planStart;
          const coversPlanEnd = intersect_end >= planEnd;

          if (coversPlanStart && coversPlanEnd) {
            finalStatus = "completed";
          } else {
            finalStatus =
              todayTask?.status !== "completed" ? "partial" : "completed";
          }

          const existingCompleted =
            hasExistingProgress && sessionMode === "append" ?
              todayTask.completedPages
            : 0;
          const intersectionFinalStart =
            hasExistingProgress && sessionMode === "append" ?
              todayTask.startPage
            : intersect_start;

          await updateLog({
            plan_id: weeklyPlan?.id,
            date: todayStr,
            start_page: intersectionFinalStart,
            end_page: intersect_end,
            completed_pages: existingCompleted + intersect_pages,
            actual_time_min,
            status: finalStatus,
            is_catchup: todayTask?.isCatchup || intersect_end > planEnd ? 1 : 0,
            sync_status: 0,
            remote_id: null,
            mistakes_count: mistakes,
            hesitation_count: hesitations,
            quality_score,
          });

          if (custom_start < intersect_start) {
            await murajaService.logExtraSession(
              user?.id ?? "",
              todayStr,
              custom_start,
              intersect_start - 1,
              intersect_start - custom_start,
              0,
              0,
              0,
              quality_score,
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
              0,
              0,
              quality_score,
            );
          }
        }
      } else {
        await updateLog({
          plan_id: weeklyPlan?.id,
          date: todayStr,
          start_page: finalStartPage,
          end_page: finalEndPage,
          completed_pages: Number(finalPages),
          actual_time_min: Number(min) || 0,
          status: finalStatus,
          is_catchup: todayTask?.isCatchup || finalEndPage > planEnd ? 1 : 0,
          sync_status: 0,
          remote_id: null,
          mistakes_count: mistakes,
          hesitation_count: hesitations,
          quality_score: PerformanceService.deriveQualityScore(
            mistakes,
            hesitations,
          ),
        });
      }

      if (isMissed) {
        router.back();
        return;
      }
      showSuccess(
        "Progress Saved",
        "Your daily muraja has been recorded.",
        () => router.back(),
      );
    } catch (err) {
      showError("Ups!", "Failed to save log");
    }
  };

  const showDetails = status !== "missed";
  const getSurahNameByNumber = (num: number) =>
    items.find((s) => s.number === num)?.englishName ?? "Surah";
  const effectiveEndPage =
    showCustomRange ? endPage
    : pages > 0 ? startPage + pages - 1
    : startPage;
  const effectiveEndSurah =
    showCustomRange ? endSurah : (
      items.find(
        (s) =>
          effectiveEndPage >= s.startingPage &&
          effectiveEndPage <= s.endingPage,
      )?.number || startSurah
    );
  const heroPages = showCustomRange ? recalcPages(startPage, endPage) : pages;

  return (
    <>
      <Screen>
        <View className="px-4 pt-4 pb-4 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-surface-muted"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={isDark ? "#ecedee" : "#11181c"}
            />
          </Pressable>
          <Text className="text-lg text-text ml-2">{formattedDate}</Text>
        </View>

        <ScreenContent>
          {isLocked && (
            <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-8 flex-row items-center gap-3">
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
              <View className="flex-1">
                <Text className="text-red-400 text-sm">Logging Locked</Text>
                <Text className="text-red-400/70 text-xs">
                  {planState === "EVALUATION_DUE" ?
                    "Please complete your evaluation exam to unlock logging."
                  : "This plan is completed. Start a new plan to resume logging."
                  }
                </Text>
              </View>
            </View>
          )}

          {hasExistingProgress && !isLocked && (
            <View className="mb-8 p-4 bg-syrface-muted border border-border rounded-2xl">
              <View className="flex-row items-center gap-3 mb-3">
                <Ionicons name="information-circle" size={20} color="#276359" />
                <Text className="text-text text-sm">
                  Today's Progress: {todayTask.completedPages} pages logged
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => updateForm({ sessionMode: "append" })}
                  className={`flex-1 py-3 px-3 rounded-xl border ${sessionMode === "append" ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text
                    className={`text-center text-xs ${sessionMode === "append" ? "text-white" : "text-muted"}`}
                  >
                    Add (Continue)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updateForm({ sessionMode: "overwrite" })}
                  className={`flex-1 py-3 px-3 rounded-xl border ${sessionMode === "overwrite" ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text
                    className={`text-center text-xs ${sessionMode === "overwrite" ? "text-white" : "text-muted"}`}
                  >
                    Overwrite (New)
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <LogStudyHero
            startSurahName={getSurahNameByNumber(startSurah)}
            endSurahName={getSurahNameByNumber(effectiveEndSurah)}
            startPage={startPage}
            effectiveEndPage={effectiveEndPage}
            heroPages={heroPages}
            isRestDay={isRestDay}
            showCustomRange={showCustomRange}
            pages={pages}
          />

          {!isLocked && (
            <>
              <View className="mb-8">
                {!showCustomRange ?
                  <Pressable
                    onPress={() => updateForm({ showCustomRange: true })}
                    className="flex-row items-center justify-center gap-2 bg-surface border border-border py-4 rounded-2xl active:bg-surface"
                  >
                    <Ionicons
                      name="options-outline"
                      size={20}
                      color="#64748b"
                    />
                    <Text className="text-muted">Add Custom Range</Text>
                  </Pressable>
                : <View className="p-5 rounded-3x border border-border shadow-sm gap-y-4">
                    <View className="flex-row justify-between items-center mb-2  bg-surface-muted">
                      <Text className="text-text text-base ml-1">
                        Study Range
                      </Text>
                      <Pressable
                        onPress={() => {
                          updateForm({
                            showCustomRange: false,
                            rangeError: "",
                          });
                          if (todayTask) {
                            const sn =
                              items.find(
                                (s) => s.englishName === todayTask.startSurah,
                              )?.number || 1;
                            const en =
                              items.find(
                                (s) => s.englishName === todayTask.endSurah,
                              )?.number || 1;
                            updateForm({
                              startSurah: sn,
                              startPage: todayTask.startPage || 1,
                              endSurah: en,
                              endPage: todayTask.endPage || 1,
                              pages: recalcPages(
                                todayTask.startPage,
                                todayTask.endPage,
                              ),
                            });
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
                        const found = items.find((s) => s.number === newSurah);
                        const newStartPage = found?.startingPage ?? startPage;
                        const updates: any = {
                          startSurah: newSurah,
                          startPage: newStartPage,
                        };
                        if (newSurah > endSurah) {
                          updates.endSurah = newSurah;
                          updates.endPage = newStartPage;
                          updates.pages = 1;
                          updates.rangeError = "";
                        } else {
                          updates.pages = recalcPages(newStartPage, endPage);
                          updates.rangeError =
                            newStartPage > endPage ?
                              "End page must be ≥ start page."
                            : "";
                        }
                        updateForm(updates);
                      }}
                    />
                    <SurahPageDropdown
                      label="Start Page"
                      surah={startSurah}
                      page={startPage}
                      setPage={(newPage) => {
                        const updates: any = { startPage: newPage };
                        if (newPage > endPage) {
                          updates.rangeError = "End page must be ≥ start page.";
                          updates.pages = 0;
                        } else {
                          updates.rangeError = "";
                          updates.pages = recalcPages(newPage, endPage);
                        }
                        updateForm(updates);
                      }}
                    />
                    <View className="h-[1px] bg-surface my-2" />
                    <SurahDropdown
                      label="End Surah"
                      surah={endSurah}
                      setSurah={(newSurah) => {
                        const found = items.find((s) => s.number === newSurah);
                        const newEndPage = found?.startingPage ?? endPage;
                        const updates: any = {
                          endSurah: newSurah,
                          endPage: newEndPage,
                        };
                        if (newEndPage < startPage) {
                          updates.rangeError = "End page must be ≥ start page.";
                          updates.pages = 0;
                        } else {
                          updates.rangeError = "";
                          updates.pages = recalcPages(startPage, newEndPage);
                        }
                        updateForm(updates);
                      }}
                    />
                    <SurahPageDropdown
                      label="End Page"
                      surah={endSurah}
                      page={endPage}
                      setPage={(newPage) => {
                        const updates: any = { endPage: newPage };
                        if (newPage < startPage) {
                          updates.rangeError = "End page must be ≥ start page.";
                          updates.pages = 0;
                        } else {
                          updates.rangeError = "";
                          updates.pages = recalcPages(startPage, newPage);
                        }
                        updateForm(updates);
                      }}
                    />
                    {rangeError ?
                      <View className="flex-row items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mt-1">
                        <Ionicons
                          name="warning-outline"
                          size={16}
                          color="#ef4444"
                        />
                        <Text className="text-red-500 text-xs flex-1">
                          {rangeError}
                        </Text>
                      </View>
                    : null}
                  </View>
                }
              </View>

              {!showCustomRange && (
                <View className="mb-8">
                  <Text className="text-text text-base mb-4 ml-1">
                    How did it go?
                  </Text>
                  <View className="flex-row justify-between">
                    <StatusTab
                      label="Completed"
                      icon="checkmark-circle"
                      variant="completed"
                      active={status === "completed"}
                      onPress={() => {
                        updateForm({
                          status: "completed",
                          pages: recalcPages(startPage, endPage),
                        });
                      }}
                    />

                    <StatusTab
                      label="Partial"
                      icon="contrast"
                      variant="partial"
                      active={status === "partial"}
                      onPress={() => {
                        updateForm({
                          status: "partial",
                          pages: Math.max(
                            1,
                            Math.floor(recalcPages(startPage, endPage) / 2),
                          ),
                        });
                      }}
                    />

                    <StatusTab
                      label="Missed"
                      icon="close-circle"
                      variant="missed"
                      active={status === "missed"}
                      onPress={() => {
                        updateForm({
                          status: "missed",
                          pages: 0,
                        });
                      }}
                    />
                  </View>
                </View>
              )}

              {showDetails && (
                <View className="mb-8">
                  <Text className="text-text text-base mb-4 ml-1">
                    Reading Quality
                  </Text>
                  <View className="flex-row gap-4">
                    <View className="flex-1 bg-surface-muted border border-border p-4 rounded-2xl">
                      <View className="flex-row items-center gap-2 mb-3">
                        <Ionicons
                          name="alert-circle-outline"
                          size={16}
                          color="#ef4444"
                        />
                        <Text className="text-muted text-xs">Mistakes</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Pressable
                          onPress={() =>
                            updateForm({ mistakes: Math.max(0, mistakes - 1) })
                          }
                          className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                        >
                          <Ionicons name="remove" size={16} color="#64748b" />
                        </Pressable>
                        <Text className="text-lg text-text">{mistakes}</Text>
                        <Pressable
                          onPress={() => updateForm({ mistakes: mistakes + 1 })}
                          className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                        >
                          <Ionicons name="add" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                    <View className="flex-1 bg-surface-muted border border-border p-4 rounded-2xl">
                      <View className="flex-row items-center gap-2 mb-3">
                        <Ionicons
                          name="timer-outline"
                          size={16}
                          color="#eab308"
                        />
                        <Text className="text-muted text-xs">Hesitations</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Pressable
                          onPress={() =>
                            updateForm({
                              hesitations: Math.max(0, hesitations - 1),
                            })
                          }
                          className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                        >
                          <Ionicons name="remove" size={16} color="#64748b" />
                        </Pressable>
                        <Text className="text-lg text-text">{hesitations}</Text>
                        <Pressable
                          onPress={() =>
                            updateForm({ hesitations: hesitations + 1 })
                          }
                          className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                        >
                          <Ionicons name="add" size={16} color="#eab308" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View className="mb-8">
                <Text className="text-text text-base mb-4 ml-1">
                  Actual Progress
                </Text>
                <View className="bg-surface-muted border border-border p-5 rounded-3xl">
                  <View className="flex-row items-center justify-between mb-6">
                    <View>
                      <Text className="text-text">Pages Completed</Text>
                      <Text className="text-muted text-[10px]">
                        {showCustomRange ?
                          `Range: ${startPage}–${endPage}`
                        : "Adjust if you did more/less"}
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-background rounded-xl p-1 border border-border">
                      <Pressable
                        onPress={() => {
                          const newPages = Math.max(0, pages - 1);
                          const updates: any = { pages: newPages };
                          if (!showCustomRange) {
                            if (newPages === 0) updates.status = "missed";
                            else if (status === "completed")
                              updates.status = "partial";
                          }
                          updateForm(updates);
                        }}
                        className="w-9 h-9 items-center justify-center active:bg-surface-muted rounded-lg"
                      >
                        <Ionicons name="remove" size={18} color="#276359" />
                      </Pressable>
                      <Text className="text-xl text-text px-4">
                        {heroPages}
                      </Text>
                      <Pressable
                        onPress={() => {
                          const newPages = pages + 1;
                          const updates: any = { pages: newPages };
                          if (!showCustomRange && status === "missed")
                            updates.status = "partial";
                          updateForm(updates);
                        }}
                        className="w-9 h-9 items-center justify-center active:bg-surface-muted rounded-lg"
                      >
                        <Ionicons name="add" size={18} color="#276359" />
                      </Pressable>
                    </View>
                  </View>
                  {showDetails && (
                    <View className="mb-5">
                      <Text className="text-muted text-[10px] uppercase tracking-widest mb-2 ml-1">
                        Time Spent (min)
                      </Text>
                      <TextInput
                        placeholder="Minutes"
                        placeholderTextColor="#cbd5e1"
                        keyboardType="numeric"
                        value={min}
                        onChangeText={(val) => updateForm({ min: val })}
                        className="bg-background/50 px-4 h-12 rounded-xl border border-border text-text text-sm"
                      />
                    </View>
                  )}
                  <View>
                    <Text className="text-muted text-[10px] uppercase tracking-widest mb-2 ml-1">
                      Notes & Reflection
                    </Text>
                    <TextInput
                      multiline
                      placeholder="any specific difficulties?"
                      placeholderTextColor="#5d6063"
                      value={note}
                      onChangeText={(val) => updateForm({ note: val })}
                      className="bg-background p-4 rounded-2xl border border-border h-24 text-text text-sm placholder:text-xs"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
                {error ?
                  <Text className="text-red-500 mt-4 text-center text-xs">
                    {error}
                  </Text>
                : null}
              </View>
            </>
          )}
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isUpdating || isLocked || !!rangeError}
            className={`h-14 rounded-2xl shadow-sm ${rangeError ? "bg-surface-muted" : "bg-primary"}`}
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