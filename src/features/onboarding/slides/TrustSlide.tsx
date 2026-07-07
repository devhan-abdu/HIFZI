import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LoginButton from "@/src/components/LoginButton";

const { width, height } = Dimensions.get("window");

export function TrustSlide() {
  const insets = useSafeAreaInsets();
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const listOpacity = useSharedValue(1);
  const loginOpacity = useSharedValue(1);

  useEffect(() => {
    // Entrance animations removed for smooth flatlist swiping
  }, []);

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

  const loginStyle = useAnimatedStyle(() => ({
    opacity: loginOpacity.value,
  }));

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
      {/* Heading */}
      <Animated.View style={headingStyle} className="mt-4">
        <Text className="text-white/60 uppercase tracking-[2px] text-[11px] mb-2 ">
          Lifetime Connection
        </Text>
        <Text className="text-white text-3xl  tracking-tight leading-tight">
          Seamless Sync{"\n"}& Lifetime Habits
        </Text>
      </Animated.View>

      {/* Cloud Sync Status Card */}
      <Animated.View style={cardStyle} className="my-6">
        <View className="bg-surface dark:bg-surface rounded-[32px] p-6 shadow-lg border border-border dark:border-white/10 items-center">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="cloud-upload" size={32} color="#276359" />
          </View>
          <Text className="text-text  text-lg text-center mb-1">
            Keep Your Streak Safe
          </Text>
          <Text className="text-muted text-xs text-center leading-5 px-4">
            All your daily targets, quality scores, and custom badges are backed
            up in real time to the secure cloud.
          </Text>

          <View className="mt-5 pt-4 border-t border-border dark:border-white/10 w-full flex-row justify-around">
            <View className="items-center">
              <Ionicons name="phone-portrait" size={20} color="#64748b" />
              <Text className="text-[9px] text-muted  uppercase mt-1">
                Mobile
              </Text>
            </View>
            <View className="justify-center">
              <Ionicons name="swap-horizontal" size={16} color="#276359" />
            </View>
            <View className="items-center">
              <Ionicons name="laptop" size={20} color="#64748b" />
              <Text className="text-[9px] text-muted  uppercase mt-1">
                Tablet
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Feature Bullet Points */}
      <Animated.View style={listStyle} className="gap-y-4 mb-4">
        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">Secure Authentication</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              Powered by Quran Foundation. Login seamlessly with your existing
              Quran.com account.
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-x-3.5">
          <View className="w-8 h-8 rounded-full bg-surface/10 items-center justify-center mt-0.5">
            <Ionicons name="sync" size={16} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base ">Always Connected</Text>
            <Text className="text-white/70 text-xs mt-0.5 leading-5">
              When a plan ends, the connection doesn&apos;t. We recycle plans so you
              stay building active habits for life.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Login Button */}
      <Animated.View style={loginStyle} className="w-full">
        <LoginButton />
      </Animated.View>
    </View>
  );
}
