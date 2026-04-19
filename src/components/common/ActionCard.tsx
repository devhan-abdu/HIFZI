import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "./ui/Text";

interface ActionCardProps {
  title: string;
  subTitle: string;
  typeLabel: string;
  status: "completed" | "partial" | "pending" | "missed";
  isCatchup?: boolean;
  isLoading: boolean;
  onDone: () => void;
  onMissed: () => void;
  logRoute: string;
}

export const ActionTaskCard = ({
  title,
  subTitle,
  typeLabel,
  status,
  isCatchup,
  isLoading,
  onDone,
  onMissed,
  logRoute,
}: ActionCardProps) => {
  const router = useRouter();
  const accentColor = "#276359";

  const isCompleted = status === "completed" || status === "partial";
  const isMissed = status === "missed";

  return (
    <View className="bg-white border border-slate-100 rounded-[12px] p-5 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-1 gap-2">
            <Text className="text-slate-400 text-[9px] uppercase tracking-[2px]">
              {typeLabel}
            </Text>
            {isCatchup && (
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-amber-700 text-[8px] uppercase">
                  Catch-up
                </Text>
              </View>
            )}
          </View>

          <Text className="text-slate-900 text-[20px] tracking-tight mb-1">
            {title}
          </Text>
          <Text className="text-slate-500 text-xs font-medium">{subTitle}</Text>
        </View>

        <Pressable
          onPress={() => router.push(logRoute as any)}
          className="bg-slate-50 w-10 h-10 rounded-2xl items-center justify-center border border-slate-100 active:scale-95"
        >
          <Ionicons name="options-outline" size={20} color={accentColor} />
        </Pressable>
      </View>

      <View className="mt-6 flex-row gap-3">
        <Pressable
          onPress={onDone}
          disabled={isLoading}
          style={{ backgroundColor: isCompleted ? accentColor : "#f8fafc" }}
          className={`h-14 flex-1 rounded-2xl flex-row items-center justify-center border ${
            isCompleted ? "border-transparent" : "border-slate-200"
          } active:opacity-90`}
        >
          {isLoading ?
            <ActivityIndicator color={isCompleted ? "white" : accentColor} />
          : <>
              <Ionicons
                name={
                  isCompleted ? "checkmark-circle"
                  : isMissed ?
                    "close-circle-outline"
                  : "checkmark-circle-outline"
                }
                size={22}
                color={
                  isCompleted ? "white"
                  : isMissed ?
                    "#f87171"
                  : "#cbd5e1"
                }
              />
              <Text
                className={`ml-3 text-sm uppercase tracking-widest ${
                  isCompleted ? "text-white"
                  : isMissed ? "text-red-500"
                  : "text-slate-400"
                }`}
              >
                {isCompleted ?
                  "Completed"
                : isMissed ?
                  "Mark Done"
                : "Mark as Done"}
              </Text>
            </>
          }
        </Pressable>
        <Pressable
          onPress={onMissed}
          disabled={isLoading}
          style={{ backgroundColor: isMissed ? "#fef2f2" : "#f8fafc" }}
          className={`h-14 flex-1 rounded-2xl flex-row items-center justify-center border ${
            isMissed ? "border-red-200" : "border-slate-200"
          } active:opacity-90`}
        >
          <Ionicons
            name={isMissed ? "close-circle" : "close-circle-outline"}
            size={22}
            color={isMissed ? "#ef4444" : "#94a3b8"}
          />
          <Text
            className={`ml-3 text-sm uppercase tracking-widest ${
              isMissed ? "text-red-500" : "text-slate-400"
            }`}
          >
            Mark Missed
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
