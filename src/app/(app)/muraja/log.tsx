import { LogPageSkeleton } from "@/src/features/muraja/components/skeletons";
import { Button } from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  const [pages, setPages] = useState<number>(weeklyPlan?.planned_pages_per_day || 1);
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
  if (!weeklyPlan) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-gray-500 text-center">
            No active plan found. Please create a plan first.
          </Text>
          <Button onPress={() => router.replace("/(app)/muraja/(tabs)")} className="mt-4">
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const isRestDay = !todayTask || todayTask.isVirtualTask;

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
        start_page: todayTask?.startPage ?? weeklyPlan.planned_pages_per_day ?? 1,
        completed_pages: Number(pages),
        actual_time_min: Number(min) || 0,
        status: status,
        is_catchup: todayTask?.isCatchup ? 1 : 0,
        sync_status: 0,
        remote_id: null,
        mistakes_count: mistakes,
        hesitation_count: hesitations,
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

  return (
    <>
      <Screen>
      <View className="bg-white px-4 pt-12 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-xl  text-slate-900 leading-tight ml-2">
          {formattedDate}
        </Text>
      </View>

        <ScreenContent>
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

          <View className="bg-primary rounded-[40px] p-7 mb-8 shadow-2xl shadow-primary/40 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-1">
                <Text className="text-white/60 uppercase tracking-[2px] text-[10px] mb-1">
                  {isRestDay ? "Extra Session" : "Today's Target"}
                </Text>
                <Text className="text-white text-3xl tracking-tighter">
                  {todayTask ? (
                    todayTask.startSurah === todayTask.endSurah ?
                      todayTask.startSurah
                    : `${todayTask.startSurah} – ${todayTask.endSurah}`
                  ) : "Extra Revision"}
                </Text>
              </View>
              <View className="bg-white/20 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-white text-[9px]  uppercase tracking-widest">
                  {todayTask?.isCatchup ? "Catchup" : "Muraja"}
                </Text>
              </View>
            </View>

            <View className="w-full h-[2px] bg-white/10 rounded-full mb-8 overflow-hidden" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white text-2xl tracking-tight leading-7">
                  {todayTask ? `${todayTask.endPage - todayTask.startPage + 1} Pages` : "Manual"}
                </Text>
                <Text className="text-white/50 text-[9px] uppercase tracking-widest mt-1">
                  Volume
                </Text>
              </View>
              
              <View className="h-8 w-px bg-white/10 mx-6" />

              <View className="flex-1">
                <Text className="text-white text-lg tracking-tight leading-6">
                  {todayTask ? `${todayTask.startPage}—${todayTask.endPage}` : "Extra"}
                </Text>
                <Text className="text-white/50 text-[9px] uppercase tracking-widest mt-1">
                  Range
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
                if (todayTask) {
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
                if (todayTask) {
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

          {showDetails && (
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
          

          <View className="mb-12 gap-6">
          <View className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mb-8">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-slate-900 text-lg ">Pages Done</Text>
                <Text className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">
                  Adjust progress
                </Text>
              </View>
              <View className="flex-row items-center bg-white rounded-2xl p-1 border border-slate-200">
                <Pressable
                  onPress={() => setPages((p: number) => Math.max(0, p - 1))}
                  className="w-10 h-10 items-center justify-center active:bg-slate-50 rounded-xl"
                >
                  <Ionicons name="remove" size={20} color="#276359" />
                </Pressable>
                <Text className="text-2xl text-slate-900 px-4 ">{pages}</Text>
                <Pressable
                  onPress={() => setPages((p: number) => p + 1)}
                  className="w-10 h-10 items-center justify-center active:bg-slate-50 rounded-xl"
                >
                  <Ionicons name="add" size={20} color="#276359" />
                </Pressable>
              </View>
            </View>

            {showDetails && (
              <View className="mb-5">
                <Text className="text-slate-400 uppercase text-[10px] mb-2 ml-1 tracking-widest ">
                  Time Spent (min)
                </Text>
                <TextInput
                  placeholder="Minutes"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={min}
                  onChangeText={setMin}
                  className="bg-white px-5 h-14 rounded-[20px] border border-slate-100 text-slate-900"
                />
              </View>
            )}

            <View>
              <Text className="text-slate-400 uppercase text-[10px] mb-2 ml-1 tracking-widest ">
                Notes
              </Text>
              <TextInput
                multiline
                placeholder="Any difficult ayahs?"
                placeholderTextColor="#94a3b8"
                value={note}
                onChangeText={setNote}
                className="bg-white p-5 rounded-[24px] border border-slate-100 h-24 text-slate-900"
                textAlignVertical="top"
              />
            </View>
          </View>
          {error && (
            <Text className="text-red-500 mb-4 text-center">{error}</Text>
          )}
          </View>
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
