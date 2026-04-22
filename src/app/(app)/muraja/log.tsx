import { LogPageSkeleton } from "@/src/features/muraja/components/skeletons";
import { Button } from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { QualityCounter } from "@/src/components/common/QualityCounter";

type StatusType = "pending" | "completed" | "partial" | "missed";

export default function LogPage() {
  const router = useRouter();

  const { weeklyPlan, todayTask, loading } = useWeeklyMuraja();
  const { updateLog, isUpdating } = useMurajaOperation();
  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();

  const [status, setStatus] = useState<StatusType>("pending");
  const [pages, setPages] = useState(weeklyPlan?.planned_pages_per_day || 1);
  const [min, setMin] = useState("");
  const [note, setNote] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (todayTask) {
      setPages(todayTask.completedPages);
      setStatus(todayTask.status);
      setMin(weeklyPlan?.estimated_time_min?.toString() || "");
    }
  }, [todayTask, weeklyPlan]);

  if (loading) return <LogPageSkeleton />;
  if (!todayTask || !weeklyPlan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-gray-500 text-center">
            No active task found for today.
          </Text>
          <Button onPress={() => router.replace("/(app)/muraja/(tabs)")} className="mt-4">
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
        start_page: todayTask.startPage,
        completed_pages: Number(pages),
        actual_time_min: Number(min) || 0,
        status: status,
        is_catchup: todayTask.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
        mistakes_count: mistakes,
        hesitation_count: hesitations,
      });

      const title = todayTask.isCatchup ? "Caught Up!" : "Progress Saved";
      const message =
        todayTask.isCatchup ?
          "MashaAllah! You've cleared your debt."
        : "Your daily muraja has been recorded.";

      showSuccess(title, message, () => router.back());
    } catch (err) {
      showError("Ups!", "Failed to save log");
    }
  };

  const showDetails = status !== "missed";

  return (
    <>
      <Screen>
        <View className="flex-row items-center mt-4 mb-2 px-2">
          <Pressable
            onPress={() => router.back()}
            className="w-12 h-12 items-center justify-center rounded-full active:bg-gray-100"
          >
            <Ionicons name="arrow-back" size={26} color="#111" />
          </Pressable>
          <View className="flex-1 ml-2">
            <Text className="text-2xl text-gray-900 tracking-tight">
              {formattedDate}
            </Text>
          </View>
        </View>

        <ScreenContent>
          {todayTask.isCatchup && (
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

          <View className="bg-primary p-6 rounded-[32px] mb-8 shadow-xl shadow-primary/20">
            <Text className="text-white/60 text-xs uppercase tracking-widest mb-2 ">
              Today's Target
            </Text>

            <Text className="text-white text-3xl mb-8 ">
              {todayTask.startSurah === todayTask.endSurah ?
                todayTask.startSurah
              : `${todayTask.startSurah} – ${todayTask.endSurah}`}
            </Text>

            <View className="flex-row items-center justify-between border-t border-white/10 pt-5">
              <View className="items-center flex-1">
                <Ionicons name="book-outline" size={16} color="#fff" />
                <Text className="text-[10px] text-white/70 mt-1">
                  Pages {todayTask.startPage}-{todayTask.endPage}
                </Text>
              </View>
              <View className="h-8 w-px bg-white/20" />
              <View className="items-center flex-1">
                <Ionicons name="layers-outline" size={16} color="#fff" />
                <Text className="text-[10px] text-white/70 mt-1">
                  {todayTask.endPage - todayTask.startPage + 1} Total
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-xl text-gray-900 mb-4 ">How did it go?</Text>
          <View className="flex-row justify-between mb-8">
            <StatusTab
              label="Completed"
              icon="checkmark-circle"
              active={status === "completed"}
              onPress={() => {
                setStatus("completed");
                setPages(todayTask.endPage - todayTask.startPage + 1);
              }}
            />
            <StatusTab
              label="Partial"
              icon="contrast"
              active={status === "partial"}
              onPress={() => {
                setStatus("partial");
                setPages(
                  Math.floor((todayTask.endPage - todayTask.startPage + 1) / 2),
                );
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

          {showDetails && (
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

          <View className="mb-12 gap-6">
            <View className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 flex-row items-center justify-between">
              <View>
                <Text className="text-gray-900 text-lg ">Pages Done</Text>
                <Text className="text-gray-400 text-xs">
                  Adjust if you read more/less
                </Text>
              </View>
              <View className="flex-row items-center bg-white rounded-2xl p-1.5 border border-gray-200">
                <Pressable
                  onPress={() => setPages((p) => Math.max(0, p - 1))}
                  className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
                >
                  <Ionicons name="remove" size={20} color="#276359" />
                </Pressable>
                <Text className="text-2xl text-gray-900 px-4 ">{pages}</Text>
                <Pressable
                  onPress={() => setPages((p) => p + 1)}
                  className="w-10 h-10 items-center justify-center active:bg-gray-50 rounded-xl"
                >
                  <Ionicons name="add" size={20} color="#276359" />
                </Pressable>
              </View>
            </View>
            {showDetails && (
              <View>
                <Text className="text-gray-400 uppercase text-[10px] mb-2 ml-1 tracking-widest ">
                  Time Spent (min)
                </Text>
                <Input
                  placeholder="Minutes"
                  value={min}
                  setValue={setMin}
                  type="numeric"
                />
              </View>
            )}

            <View>
              <Text className="text-gray-400 uppercase text-[10px] mb-2 ml-1 tracking-widest ">
                Notes
              </Text>
              <TextInput
                multiline
                placeholder="Any difficult ayahs?"
                value={note}
                onChangeText={setNote}
                className="bg-gray-50 p-5 rounded-[28px] border border-gray-100 h-24 text-gray-900 "
                textAlignVertical="top"
              />
            </View>
          </View>
          {error && (
            <Text className="text-red-500 mb-4 text-center">{error}</Text>
          )}
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSave}
            disabled={isUpdating}
            className="bg-primary h-14 shadow-lg shadow-primary/30"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-white text-lg mr-2 ">Save Progress</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </Button>
        </ScreenFooter>
      </Screen>
      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
}
