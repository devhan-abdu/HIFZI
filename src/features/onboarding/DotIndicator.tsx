import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

interface Props {
  count: number;
  activeIndex: number;
  dark?: boolean;
}

export function DotIndicator({ count, activeIndex, dark = false }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === activeIndex} dark={dark} />
      ))}
    </View>
  );
}

function Dot({ active, dark }: { active: boolean; dark: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(active ? 24 : 8, { duration: 300 }),
    opacity: withTiming(active ? 1 : 0.35, { duration: 300 }),
    backgroundColor: dark ? "#FFFFFF" : "#276359",
  }));

  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3 }, animatedStyle]}
    />
  );
}
