import React from "react";
import {
  View,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { notificationManager } from "@/src/features/notifications/services/notificationManager";

const { width } = Dimensions.get("window");

export interface NotificationPermissionModalProps {
  visible: boolean;
  onEnable: () => void;
  onSkip: () => void;
  loading?: boolean;
}

export function NotificationPermissionModal({
  visible,
  onEnable,
  onSkip,
  loading = false,
}: NotificationPermissionModalProps) {
  const scale = useSharedValue(0.8);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      scale.value = withSpring(0.8, { damping: 15, stiffness: 200 });
    }
  }, [visible, scale]);

  const handleEnable = async () => {
    await notificationManager.requestPermissions();
    onEnable();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View className="flex-1 bg-black/30 items-center justify-center px-6">
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[scaleStyle]}
          className="w-full rounded-3xl bg-white overflow-hidden shadow-2xl"
        >
          {/* Header Icon */}
          <View className="pt-8 pb-6 items-center">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="notifications" size={32} color="#276359" />
            </View>

            <Text className="text-xl text-slate-900 text-center px-6">
              Never Miss a Review
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-3 px-6 leading-5">
              Enable reminders to stay consistent with your Quran goals. We'll
              send gentle nudges at your chosen habit time.
            </Text>
          </View>

          {/* Feature List */}
          <View className="px-6 py-5 bg-slate-50 border-t border-slate-100">
            <View className="gap-y-3.5">
              <View className="flex-row items-start gap-x-3">
                <View className="w-5 h-5 rounded-full bg-primary/20 items-center justify-center mt-0.5 flex-shrink-0">
                  <Ionicons name="checkmark" size={12} color="#276359" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 text-sm">Perfect Timing</Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    After your chosen daily habit
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-x-3">
                <View className="w-5 h-5 rounded-full bg-primary/20 items-center justify-center mt-0.5 flex-shrink-0">
                  <Ionicons name="checkmark" size={12} color="#276359" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 text-sm">Protect Your Streak</Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    Never lose progress accidentally
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-x-3">
                <View className="w-5 h-5 rounded-full bg-primary/20 items-center justify-center mt-0.5 flex-shrink-0">
                  <Ionicons name="checkmark" size={12} color="#276359" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 text-sm">Stay Accountable</Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    Consistent reminders build lasting habits
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View className="px-6 py-6 gap-y-3">
            <Pressable
              onPress={handleEnable}
              disabled={loading}
              className={`rounded-2xl px-6 h-14 items-center justify-center ${
                loading ? "opacity-70" : "opacity-100"
              } bg-primary`}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white text-sm font-semibold uppercase tracking-[1px]">
                  Enable Reminders
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onSkip}
              disabled={loading}
              className="rounded-2xl px-6 h-12 items-center justify-center"
            >
              <Text className="text-slate-500 text-sm">Maybe Later</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
