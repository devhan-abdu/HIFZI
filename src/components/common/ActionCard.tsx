import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  onDetails: () => void;
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
  onDetails,
}: ActionCardProps) => {
    const isCompleted = status === "completed";
    const isPartial = status === "partial";
    const isMissed = status === "missed";
    const isFinished = isCompleted || isPartial;
  
    const hifzColor = "#276359";
    const murajaColor = "#0891b2";
    const accentColor = typeLabel.toLowerCase().includes("hifz") ? hifzColor : murajaColor;

    return (
        <Pressable 
            onPress={isResumable ? onResume : onStart}
            disabled={isLoading}
            className="overflow-hidden rounded-[32px] shadow-sm active:scale-[0.98] transition-all bg-white border border-slate-100 p-6"
        >
            <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-4">
                    <View className="flex-row items-center mb-3 gap-2">
                        <View className={`px-2 py-0.5 rounded-full ${isFinished ? 'bg-slate-100' : 'bg-slate-50'}`}>
                            <Text style={{ color: isFinished ? '#64748b' : accentColor }} className="text-[9px] uppercase tracking-widest">
                                {typeLabel}
                            </Text>
                        </View>
                        {isCatchup && !isFinished && (
                            <View className="bg-amber-50 px-2 py-0.5 rounded-full">
                                <Text className="text-amber-600 text-[9px] uppercase tracking-widest">Catch-up</Text>
                            </View>
                        )}
                        {isMissed && (
                            <View className="bg-rose-50 px-2 py-0.5 rounded-full">
                                <Text className="text-rose-600 text-[9px] uppercase tracking-widest">Missed</Text>
                            </View>
                        )}
                        {isPartial && (
                            <View className="bg-sky-50 px-2 py-0.5 rounded-full flex-row items-center">
                                <Ionicons name="pause-circle" size={10} color="#0284c7" />
                                <Text className="text-sky-700 text-[9px] uppercase tracking-widest ml-1">Partial</Text>
                            </View>
                        )}
                        {isCompleted && (
                            <View className="bg-emerald-50 px-2 py-0.5 rounded-full flex-row items-center">
                                <Ionicons name="checkmark-circle" size={10} color="#059669" />
                                <Text className="text-emerald-700 text-[9px] uppercase tracking-widest ml-1">Completed</Text>
                            </View>
                        )}
                    </View>

          <Text className="text-2xl tracking-tight mb-1 text-slate-900">
            {title}
          </Text>
          <Text className="text-sm font-medium text-slate-500">
            {subTitle}
          </Text>
        </View>

        <Pressable
          onPress={onDetails}
          className="w-10 h-10 rounded-2xl items-center justify-center active:scale-95 bg-slate-50 border border-slate-100"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
        </Pressable>
      </View>

      <View className="mt-8 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {isLoading ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <>
              <Text style={{ color: isFinished ? '#94a3b8' : accentColor }} className="uppercase tracking-widest text-[10px]">
                {isFinished ? (isCompleted ? "Review Activity" : "Resume Session") : isResumable ? "Resume Session" : "Open Mushaf"}
              </Text>
              <Ionicons 
                name={isFinished ? "arrow-forward" : "chevron-forward"} 
                size={12} 
                color={isFinished ? "#94a3b8" : accentColor} 
                style={{ marginLeft: 6 }} 
              />
            </>
          )}
        </View>

        {!isCompleted && (
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="h-10 px-4 rounded-lg flex-row items-center bg-slate-50 border border-slate-100 active:bg-slate-100"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={accentColor} />
            <Text style={{ color: accentColor }} className="uppercase tracking-widest text-[9px] ml-2">Mark Done</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};


