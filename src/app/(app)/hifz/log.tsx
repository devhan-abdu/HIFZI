import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { useHifzCardState } from "@/src/features/hifz/hooks/useHifzCardState";
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
import { getTodayTask } from "@/src/features/hifz/utils/quran-logic";
import { useReaderSessionStore } from "@/src/features/quran/store/readerSessionStore";
import { ExistingProgressCard } from "@/src/features/hifz/components/hifz-log/ExistingProgressCard";
import { HeroCard } from "@/src/features/hifz/components/hifz-log/HeroCard";
export default function LogProgress() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams<{
    reviewStartPage?: string;
    reviewEndPage?: string;
    reviewCycleDay?: string;
  }>();
  const { user } = useSession();

  const { hifz: plan, isLoading: planLoading } = useHifzPlan();
  const cardState = useHifzCardState();
  const { items: surahData, loading: quranLoading } = useLoadSurahData();
  const { addLog, isCreating: isAddingHifz } = useAddLog();
  const { logRetention, isLogging: isLoggingRetention } = useRetentionLog();

  const isLocked =
    cardState.type === "EVALUATION_DUE" || cardState.type === "PLAN_FINISHED";
  const planState =
    cardState.type === "EVALUATION_DUE" ? "EVALUATION_DUE"
    : cardState.type === "PLAN_FINISHED" ? "COMPLETION_DUE"
    : null;

  const logContext =
    (
      cardState.type === "PLANNED_DAY" ||
      cardState.type === "CATCHUP_DAY" ||
      cardState.type === "COMPLETED_TODAY"
    ) ?
      cardState.task
    : null;

  const reviewStartPage = Number(params.reviewStartPage ?? 0);
  const reviewEndPage = Number(params.reviewEndPage ?? 0);
  const hasReviewPrefill =
    Number.isFinite(reviewStartPage) && reviewStartPage > 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = plan?.hifzDailyLogs?.find((l) => l.date === todayStr);
  const completedPages = todayLog ? (todayLog.actualPagesCompleted ?? 0) : 0;
  const hasExistingProgress = completedPages > 0;

  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<"completed" | "partial" | "missed">(
    "completed",
  );
  const [notes, setNotes] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionMode, setSessionMode] = useState<"append" | "overwrite">(
    "append",
  );
  const [startSurah, setStartSurah] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [endSurah, setEndSurah] = useState(1);
  const [endPage, setEndPage] = useState(1);

  const isRestDay = !hasReviewPrefill && cardState.type === "REST_DAY";

  const activeTask = React.useMemo(() => {
    if (!plan || !surahData.length) return logContext;
    return getTodayTask(plan, surahData, pages);
  }, [plan, surahData, pages, logContext]);

  const sessionMistakes = useReaderSessionStore((s) => s.mistakes);
  const sessionHesitations = useReaderSessionStore((s) => s.hesitations);
  const resetSessionTally = useReaderSessionStore((s) => s.resetTally);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  useEffect(() => {
    if (sessionMistakes > 0) setMistakes(sessionMistakes);
    if (sessionHesitations > 0) setHesitations(sessionHesitations);
    if (sessionMistakes > 0 || sessionHesitations > 0) resetSessionTally();
  }, [sessionMistakes, sessionHesitations, resetSessionTally]);

  useEffect(() => {
    if (hasReviewPrefill && reviewEndPage >= reviewStartPage) {
      setPages(Math.max(1, reviewEndPage - reviewStartPage + 1));
      return;
    }
    if (isRestDay) {
      if (plan) setPages(plan.pagesPerDay);
      return;
    }
    if (!logContext) return;
    if (hasExistingProgress) {
      setStatus("completed");
      setPages(Math.max(0, logContext.totalTarget - completedPages));
    } else {
      setPages(logContext.totalTarget);
    }
  }, [hasReviewPrefill, logContext, reviewEndPage, reviewStartPage, isRestDay]);

  useEffect(() => {
    if (isRestDay && surahData.length > 0) {
      const found = surahData.find((s) => s.number === startSurah);
      if (found) setStartPage(found.startingPage);
    }
  }, [startSurah, isRestDay, surahData]);

  useEffect(() => {
    if (isRestDay && surahData.length > 0) {
      const found = surahData.find((s) => s.number === endSurah);
      if (found) setEndPage(found.startingPage);
    }
  }, [endSurah, isRestDay, surahData]);

  useEffect(() => {
    if (startSurah > endSurah) setEndSurah(startSurah);
  }, [startSurah]);

  useEffect(() => {
    if (startPage > endPage) setEndPage(startPage);
  }, [startPage]);

  useEffect(() => {
    if (hasReviewPrefill) return;
    const targetPages = logContext?.totalTarget;
    if (!targetPages) return;
    if (pages >= targetPages) setStatus("completed");
    else if (pages === 0) setStatus("missed");
    else setStatus("partial");
  }, [hasReviewPrefill, logContext?.totalTarget, pages]);

  const handleStatusSelection = (
    selectedStatus: "completed" | "partial" | "missed",
  ) => {
    setStatus(selectedStatus);
    const targetPages =
      hasReviewPrefill && reviewEndPage >= reviewStartPage ?
        Math.max(1, reviewEndPage - reviewStartPage + 1)
      : (logContext?.totalTarget ?? 1);
    if (selectedStatus === "completed") setPages(targetPages);
    else if (selectedStatus === "missed") setPages(0);
    else setPages(Math.max(1, Math.floor(targetPages / 2)));
  };

  if (planLoading || quranLoading) return <LogProgressSkeleton />;

  if (!plan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-xl text-text text-center">
            No Active Plan Found
          </Text>
          <Button className="mt-4" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const handleSave = async () => {
    if (!plan || isAddingHifz || isLoggingRetention || !plan.id || isLocked)
      return;

    try {
      const today = new Date();
      const logDay = (today.getDay() + 6) % 7;
      const isMissed = status === "missed";

      const finalPages =
        isMissed ? 0
        : hasExistingProgress && sessionMode === "append" && !hasReviewPrefill ?
          completedPages + pages
        : pages;

      const actualStartPage =
        hasReviewPrefill ? reviewStartPage
        : hasExistingProgress && sessionMode === "append" ?
          (todayLog?.actualStartPage ?? activeTask?.startPage ?? plan.startPage)
        : (activeTask?.startPage ?? plan.startPage);

      const actualEndPage =
        hasReviewPrefill ?
          reviewStartPage + Math.max(0, finalPages - 1)
        : (getTodayTask(plan, surahData, finalPages)?.endPage ??
          actualStartPage);

      if (hasReviewPrefill) {
        const pagesArray = Array.from(
          { length: Math.max(0, actualEndPage - actualStartPage + 1) },
          (_, i) => actualStartPage + i,
        );
        await logRetention({
          pages: pagesArray,
          quality: PerformanceService.deriveQualityScore(mistakes, hesitations),
          date: today.toISOString().slice(0, 10),
        });
      } else {
        const payload: IHifzLog = {
          hifzPlanId: plan.id,
          actualPagesCompleted: finalPages,
          actualStartPage,
          actualEndPage,
          status,
          date: today.toISOString().slice(0, 10),
          logDay,
          notes: notes.trim(),
          mistakesCount: mistakes,
          hesitationCount: hesitations,
        };
        await addLog({ todayLog: payload, userId: user?.id });
      }

      router.back();
    } catch (err) {
      console.error("[HifzLog] Save failed:", err);
      setErrorMessage(
        "We couldn't save your progress. Please check your connection and try again.",
      );
      setErrorVisible(true);
    }
  };

  const heroSurahLabel =
    hasReviewPrefill ? "Targeted Review" : (activeTask?.displaySurah ?? "—");
  const heroRangeLabel =
    hasReviewPrefill ?
      `${reviewStartPage}—${reviewEndPage}`
    : `${activeTask?.startPage ?? 0}—${activeTask?.endPage ?? 0}`;
  const heroPageCount =
    hasReviewPrefill ? Math.max(1, reviewEndPage - reviewStartPage + 1) : pages;

  return (
    <>
      <View className="bg-surface-muted px-4 pt-4 pb-4 flex-row items-center ">
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
      <Screen>
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

          {hasExistingProgress && !isLocked && !hasReviewPrefill && (
            <ExistingProgressCard
              hasExistingProgress={hasExistingProgress}
              isLocked={isLocked}
              hasReviewPrefill={hasReviewPrefill}
              completedPages={completedPages}
              sessionMode={sessionMode}
              setSessionMode={setSessionMode}
            />
          )}

          <HeroCard
            hasReviewPrefill={hasReviewPrefill}
            logContext={logContext}
            isRestDay={isRestDay}
            heroSurahLabel={heroSurahLabel}
            heroRangeLabel={heroRangeLabel}
            heroPageCount={heroPageCount}
          />

          {!isLocked && (
            <View className="mb-8">
              <Text className="text-text text-base mb-4 ml-1">
                How did it go?
              </Text>
              <View className="flex-row justify-between">
                <StatusTab
                  label="Completed"
                  variant="completed"
                  icon="checkmark-circle"
                  active={status === "completed"}
                  onPress={() => handleStatusSelection("completed")}
                />
                <StatusTab
                  label="Partial"
                  icon="contrast"
                  variant="partial"
                  active={status === "partial"}
                  onPress={() => handleStatusSelection("partial")}
                />
                <StatusTab
                  label="Missed"
                  variant="missed"
                  icon="close-circle"
                  active={status === "missed"}
                  onPress={() => handleStatusSelection("missed")}
                />
              </View>
            </View>
          )}

          {status !== "missed" && !isLocked && (
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
                      onPress={() => setMistakes(Math.max(0, mistakes - 1))}
                      className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                    >
                      <Ionicons name="remove" size={16} color="#64748b" />
                    </Pressable>
                    <Text className="text-lg text-text">{mistakes}</Text>
                    <Pressable
                      onPress={() => setMistakes(mistakes + 1)}
                      className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                    >
                      <Ionicons name="add" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
                <View className="flex-1 bg-surface-muted border border-border p-4 rounded-2xl">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="timer-outline" size={16} color="#eab308" />
                    <Text className="text-muted text-xs">Hesitations</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Pressable
                      onPress={() =>
                        setHesitations(Math.max(0, hesitations - 1))
                      }
                      className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                    >
                      <Ionicons name="remove" size={16} color="#64748b" />
                    </Pressable>
                    <Text className="text-lg text-text">{hesitations}</Text>
                    <Pressable
                      onPress={() => setHesitations(hesitations + 1)}
                      className="w-8 h-8 items-center justify-center bg-background rounded-lg active:bg-surface-muted"
                    >
                      <Ionicons name="add" size={16} color="#eab308" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}

          {!isLocked && (
            <View className="mb-8">
              <Text className="text-text text-base mb-4 ml-1">
                Actual Progress
              </Text>
              <View className="bg-surface-muted border border-border p-5 rounded-3xl">
                <View className="flex-row items-center justify-between mb-6">
                  <View>
                    <Text className="text-text">Pages Completed</Text>
                    <Text className="text-muted text-[10px]">
                      Adjust if you did more/less
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-background rounded-xl p-1 border border-border">
                    <Pressable
                      onPress={() => {
                        const newPages = Math.max(0, pages - 1);
                        setPages(newPages);
                        if (newPages === 0) setStatus("missed");
                      }}
                      className="w-9 h-9 items-center justify-center active:bg-surface-muted rounded-lg"
                    >
                      <Ionicons name="remove" size={18} color="#276359" />
                    </Pressable>
                    <Text className="text-xl text-text px-4">{pages}</Text>
                    <Pressable
                      onPress={() => {
                        const newPages = pages + 1;
                        setPages(newPages);
                        if (status === "missed") setStatus("partial");
                      }}
                      className="w-9 h-9 items-center justify-center active:bg-surface-muted rounded-lg"
                    >
                      <Ionicons name="add" size={18} color="#276359" />
                    </Pressable>
                  </View>
                </View>
                <Text className="text-muted text-[10px] uppercase tracking-widest mb-2 ml-1">
                  Notes & Reflection
                </Text>
                <TextInput
                  multiline
                  placeholder="Specific difficulties or ayahs to focus on?"
                  placeholderTextColor="#cbd5e1"
                  value={notes}
                  onChangeText={setNotes}
                  className="bg-background/50 p-4 rounded-2xl border border-border h-24 text-text text-sm"
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isAddingHifz || isLoggingRetention || isLocked}
            className="bg-primary h-14 rounded-2xl shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-primary-foreground text-base mr-2">
                {isLocked ? "Logging Locked" : "Save Progress"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={isDark ? "#ecedee" : "#ffffff"}
              />
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
          onConfirm={() => setErrorVisible(false)}
          onCancel={() => setErrorVisible(false)}
        />
      </Screen>
    </>
  );
}