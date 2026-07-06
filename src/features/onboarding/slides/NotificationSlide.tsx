import React, { useEffect } from "react";
import { View, Dimensions, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { notificationManager } from "@/src/features/notifications/services/notificationManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNotificationPermissions } from "@/src/hooks/useNotificationPermissions";

const { width, height } = Dimensions.get("window");

export function NotificationSlide({ onNext }: { onNext: () => void }) {
  const { togglePreference } = useNotificationPermissions();
  const insets = useSafeAreaInsets();
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const listOpacity = useSharedValue(1);
  const btnOpacity = useSharedValue(1);

  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
  }));

  const handleEnable = async () => {
    await togglePreference(true);
    onNext();
  };

  const handleSkip = async () => {
    await togglePreference(false);
    onNext();
  };

  return (
    <View
      style={[
        {
          width,
          height,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      className="bg-primary flex-1 justify-between px-8"
    >
      <Animated.View style={headingStyle} className="mt-4">
        <Text className="text-white/60 uppercase tracking-[2px] text-[11px] mb-2">
          Habit Stacking
        </Text>
        <Text className="text-white text-3xl tracking-tight leading-tight">
          Never Miss {"\n"}Your Daily Goal
        </Text>
      </Animated.View>

      <Animated.View style={cardStyle} className="my-6">
        <View className="bg-surface rounded-[32px] p-6 shadow-lg border border-border items-center">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="notifications" size={32} color="#276359" />
          </View>
          <Text className="text-text text-lg text-center mb-1">
            Stay on Track
          </Text>
          <Text className="text-muted text-xs text-center leading-5 px-4">
            The secret to consistency is tying Quran review to something you already do every day.
          </Text>

          <View className="mt-5 pt-4 border-t border-border w-full">
            <View className="flex-row items-center justify-center gap-x-2">
              <View className="bg-surface px-3 py-1.5 rounded-lg">
                <Text className="text-xs text-muted font-medium">1. Finish Fajr</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
              <View className="bg-surface border border-border px-3 py-1.5 rounded-lg">
                <Text className="text-xs text-text font-medium">2. Read Quran</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={listStyle} className="gap-y-4 mb-4">
        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="time" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base">Perfect Timing</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              We'll send a gentle reminder exactly when your chosen habit is done (e.g. after dinner).
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base">Protect Your Streak</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Avoid accidental breaks in your progress with friendly nudges.
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={btnStyle} className="w-full gap-y-3">
        <Pressable
          onPress={handleEnable}
          className="w-full h-14 bg-surface rounded-xl items-center justify-center shadow-sm"
        >
          <Text className="text-primary text-base font-semibold">Enable Reminders</Text>
        </Pressable>
        <Pressable
          onPress={handleSkip}
          className="w-full h-12 items-center justify-center"
        >
          <Text className="text-white/70 text-sm">Skip for now</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
