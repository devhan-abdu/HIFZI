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
  onDetails: () => void;
  hideActionButtons?: boolean;
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
  onDetails,
  hideActionButtons,
}: ActionCardProps) => {
    const isCompleted = status === "completed";
    const isPartial = status === "partial";
    const isMissed = status === "missed";
    const isFinished = isCompleted || isPartial;
    const accentColor = "#276359";

    return (
        <Pressable 
            onPress={onStart}
            disabled={isLoading}
            className="overflow-hidden rounded-[32px] shadow-sm active:scale-[0.98] transition-all bg-surface dark:bg-surface-muted border border-border dark:border-white/10 p-6"
        >
            <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-4">
                    <View className="flex-row items-center mb-3 gap-2">
                        <View className="px-2 py-0.5 rounded-full bg-background dark:bg-background/30 border border-border dark:border-white/10">
                            <Text style={{ color: accentColor }} className="text-[9px] uppercase tracking-widest">
                                {typeLabel}
                            </Text>
                        </View>
                        {isCatchup && !isFinished && (
                            <View className="bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-500/25">
                                <Text className="text-amber-500 text-[9px] uppercase tracking-widest">Catch-up</Text>
                            </View>
                        )}
                        {isMissed && (
                            <View className="bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 dark:border-rose-500/25">
                                <Text className="text-rose-500 text-[9px] uppercase tracking-widest">Missed</Text>
                            </View>
                        )}
                        {isPartial && (
                            <View className="bg-sky-500/10 px-2 py-0.5 rounded-full flex-row items-center border border-sky-500/20 dark:border-sky-500/25">
                                <Ionicons name="pause-circle" size={10} color="#0ea5e9" />
                                <Text className="text-sky-500 text-[9px] uppercase tracking-widest ml-1">Partial</Text>
                            </View>
                        )}
                        {isCompleted && (
                            <View className="bg-emerald-500/10 px-2 py-0.5 rounded-full flex-row items-center border border-emerald-500/20 dark:border-emerald-500/25">
                                <Ionicons name="checkmark-circle" size={10} color="#10b981" />
                                <Text className="text-emerald-500 text-[9px] uppercase tracking-widest ml-1">Completed</Text>
                            </View>
                        )}
                    </View>

          <Text className="text-2xl tracking-tight mb-1 text-text">
            {title}
          </Text>
          <Text className="text-sm text-muted">
            {subTitle}
          </Text>
        </View>



        {!hideActionButtons && (
          <Pressable
            onPress={onDetails}
            className="w-10 h-10 rounded-2xl items-center justify-center active:scale-95 bg-background dark:bg-background/30 border border-border dark:border-white/10"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {!hideActionButtons && (
        <View className="mt-8 flex-row items-center justify-between">
          <View className="flex-row items-center">
            {isLoading ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
                <>
                <Text style={{ color: accentColor }} className="uppercase tracking-widest text-[10px]">
                  Open Mushaf
                </Text>
                <Ionicons 
                  name={isFinished ? "arrow-forward" : "chevron-forward"} 
                  size={12} 
                  color={accentColor} 
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
              className="h-10 px-4 rounded-lg flex-row items-center bg-surface-muted   border border-surface-muted text-primary  active:bg-surface dark:active:bg-surface-muted"
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={accentColor} />
              <Text style={{ color: accentColor }} className="uppercase tracking-widest text-[9px] ml-2">Mark Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

