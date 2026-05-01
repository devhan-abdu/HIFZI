import React, { useState } from "react";
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
  onDone: (quality?: number) => void;
  onStart: () => void;
  onResume?: () => void;
  isResumable?: boolean;
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
  onStart,
  onResume,
  isResumable,
  logRoute,
}: ActionCardProps) => {
  const router = useRouter();
  const accentColor = "#276359";
  const [showQuality, setShowQuality] = useState(false);

  const isCompleted = status === "completed" || status === "partial";
  const isMissed = status === "missed";

  const handleDonePress = () => {
    if (isCompleted) {
      onDone(); 
    } else {
      setShowQuality(!showQuality);
    }
  };

  const selectQuality = (score: number) => {
    onDone(score);
    setShowQuality(false);
  };

  return (
    <View className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-2 gap-2">
            <Text className="text-slate-400 text-[10px] uppercase tracking-[2px] font-bold">
              {typeLabel}
            </Text>
            {isCatchup && (
              <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                <Text className="text-amber-700 text-[8px] uppercase font-bold">
                  Catch-up
                </Text>
              </View>
            )}
            {isMissed && (
               <View className="bg-red-100 px-2 py-0.5 rounded-full">
                <Text className="text-red-700 text-[8px] uppercase font-bold">
                  Missed
                </Text>
              </View>
            )}
          </View>

          <Text className="text-slate-900 text-[22px] font-bold tracking-tight mb-1">
            {title}
          </Text>
          <Text className="text-slate-500 text-sm font-medium">{subTitle}</Text>
        </View>

        <Pressable
          onPress={() => router.push(logRoute as any)}
          className="bg-slate-50 w-12 h-12 rounded-2xl items-center justify-center border border-slate-100 active:scale-95"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={accentColor} />
        </Pressable>
      </View>

      {showQuality && !isCompleted ? (
        <View className="mt-8 flex-row gap-2">
          <Pressable
            onPress={() => selectQuality(5)}
            className="flex-1 bg-emerald-50 border border-emerald-100 h-16 rounded-2xl items-center justify-center active:scale-95"
          >
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text className="text-emerald-700 font-bold text-[10px] mt-1 uppercase tracking-tighter">Perfect</Text>
          </Pressable>
          <Pressable
            onPress={() => selectQuality(3)}
            className="flex-1 bg-amber-50 border border-amber-100 h-16 rounded-2xl items-center justify-center active:scale-95"
          >
            <Ionicons name="warning" size={20} color="#d97706" />
            <Text className="text-amber-700 font-bold text-[10px] mt-1 uppercase tracking-tighter">Stumbles</Text>
          </Pressable>
          <Pressable
            onPress={() => selectQuality(1)}
            className="flex-1 bg-rose-50 border border-rose-100 h-16 rounded-2xl items-center justify-center active:scale-95"
          >
            <Ionicons name="help-circle" size={20} color="#e11d48" />
            <Text className="text-rose-700 font-bold text-[10px] mt-1 uppercase tracking-tighter">Struggle</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-8 flex-row gap-3">
          {!isCompleted && (
            <Pressable
              onPress={isResumable ? onResume : onStart}
              disabled={isLoading}
              className="h-14 flex-[2] rounded-2xl flex-row items-center justify-center bg-[#276359] active:opacity-90 shadow-sm"
            >
              <Ionicons
                name={isResumable ? "play-forward" : "book-outline"}
                size={20}
                color="white"
              />
              <Text className="ml-3 text-white font-bold uppercase tracking-widest text-xs">
                {isResumable ? "Resume" : "Start Recitation"}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleDonePress}
            disabled={isLoading}
            style={{ 
              backgroundColor: isCompleted ? "#f1f5f9" : isMissed ? "#fef2f2" : "#f8fafc",
              flex: isCompleted ? 1 : 1
            }}
            className={`h-14 rounded-2xl flex-row items-center justify-center border ${
              isCompleted ? "border-slate-200" : isMissed ? "border-red-100" : "border-slate-200"
            } active:opacity-90`}
          >
            {isLoading ? (
              <ActivityIndicator color={accentColor} />
            ) : (
              <>
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={22}
                  color={isCompleted ? accentColor : isMissed ? "#f87171" : "#cbd5e1"}
                />
                <Text
                  className={`ml-3 text-xs uppercase tracking-widest font-bold ${
                    isCompleted ? "text-slate-900" : isMissed ? "text-red-400" : "text-slate-400"
                  }`}
                >
                  {isCompleted ? "Done" : "Mark Done"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};
