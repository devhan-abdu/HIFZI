import React, { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../common/ui/Text";
import { QualityModal } from "../common/QualityModal";
import { useRetentionLog } from "@/src/features/habits/hooks/useRetentionLog";
import { useCelebrationStore } from "@/src/hooks/useCelebrationStore";

interface ReinforcementCardProps {
  task: {
    startPage: number;
    endPage: number;
    actualPages: number[];
    displaySurah?: string;
    priority?: string;
    badgeColor?: { badge: string; text: string };
    label?: string;
  };
  onStart: () => void;
  isCompleted?: boolean;
}

export const ReinforcementCard = ({
  task,
  onStart,
  isCompleted = false,
}: ReinforcementCardProps) => {
  const { logRetention, isLogging } = useRetentionLog();
  const trigger = useCelebrationStore((s) => s.trigger);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

  const handleComplete = async (quality: number) => {
    try {
      await logRetention({
        pages: task.actualPages,
        quality,
        date: new Date().toISOString().slice(0, 10),
      });
      trigger("Mastery boosted!", "success");
    } catch (error) {
      console.error("Failed to log reinforcement", error);
    }
  };

  if (isCompleted) {
    return (
      <View className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3">
            <Ionicons name="sparkles" size={16} color="#059669" />
          </View>
          <View>
            <Text className="text-emerald-900  text-sm">Retention Secured</Text>
            <Text className="text-emerald-600/70 text-[10px] uppercase tracking-widest">{task.label || 'Memory Refreshed'} · {task.displaySurah || 'Quran Review'}</Text>
          </View>
        </View>
        <Ionicons name="checkmark-circle" size={24} color="#059669" />
      </View>
    );
  }

  return (
    <View className="bg-slate-50 border border-slate-100 rounded-[28px] p-5">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            {task.priority && task.badgeColor && (
              <View className={`px-2 py-0.5 rounded-full ${task.badgeColor.badge} mr-2`}>
                <Text className={`text-[8px] uppercase tracking-widest  ${task.badgeColor.text}`}>
                  {task.priority}
                </Text>
              </View>
            )}
            <Text className="text-slate-400 text-[10px] uppercase tracking-widest">{task.label || 'Optional Review'}</Text>
          </View>
          <Text className="text-lg  text-slate-900">{task.displaySurah || 'Quran Review'}</Text>
          <Text className="text-slate-500 text-xs">Pages {task.startPage} – {task.endPage}</Text>
        </View>
        
        <Pressable 
          onPress={() => setQualityModalVisible(true)}
          disabled={isLogging}
          className="h-10 w-10 rounded-2xl bg-white border border-slate-200 items-center justify-center active:scale-95 shadow-sm"
        >
          {isLogging ? (
            <ActivityIndicator size="small" color="#276359" />
          ) : (
            <Ionicons name="checkmark-done" size={20} color="#276359" />
          )}
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-slate-50">
        <Pressable 
          onPress={onStart}
          className="flex-row items-center active:opacity-60"
        >
          <Text className="text-primary uppercase tracking-widest text-[10px]">Open Mushaf</Text>
          <Ionicons name="arrow-forward" size={12} color="#276359" style={{ marginLeft: 6 }} />
        </Pressable>
      </View>

      <QualityModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
        onSelect={(score) => {
          setQualityModalVisible(false);
          handleComplete(score);
        }}
        title="Rate your retention"
      />
    </View>
  );
};
