import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";

type Props = {
  hasExistingProgress: boolean;
  isLocked: boolean;
  hasReviewPrefill: boolean;
  completedPages: number;
  sessionMode: "append" | "overwrite";
  setSessionMode: (mode: "append" | "overwrite") => void;
};

export function ExistingProgressCard({
  hasExistingProgress,
  isLocked,
  hasReviewPrefill,
  completedPages,
  sessionMode,
  setSessionMode,
}: Props) {
  if (!hasExistingProgress || isLocked || hasReviewPrefill) {
    return null;
  }

  return (
    <View className="mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
      <View className="flex-row items-center gap-3 mb-3">
        <Ionicons name="information-circle" size={20} color="#276359" />

        <Text className="text-primary text-sm">
          Today's Progress: {completedPages} pages logged
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setSessionMode("append")}
          className={`flex-1 py-2 px-3 rounded-xl border ${
            sessionMode === "append" ?
              "bg-primary border-primary"
            : "bg-surface border-border"
          }`}
        >
          <Text
            className={`text-center text-xs ${
              sessionMode === "append" ? "text-white" : "text-muted"
            }`}
          >
            Add (Continue)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSessionMode("overwrite")}
          className={`flex-1 py-2 px-3 rounded-xl border ${
            sessionMode === "overwrite" ?
              "bg-primary border-primary"
            : "bg-surface border-border"
          }`}
        >
          <Text
            className={`text-center text-xs ${
              sessionMode === "overwrite" ? "text-white" : "text-muted"
            }`}
          >
            Overwrite (New)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
