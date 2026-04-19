import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

interface SwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

export const Switch = ({ value, onValueChange }: SwitchProps) => {
  const offset = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    offset.value = withSpring(value ? 1 : 0, { mass: 0.5 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      offset.value,
      [0, 1],
      ["#e2e8f0", "#276359"],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * 14 }],
  }));

  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View
        style={trackStyle}
        className="w-10 h-6 rounded-full p-1 flex-row items-center"
      >
        <Animated.View
          style={thumbStyle}
          className="w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </Animated.View>
    </Pressable>
  );
};
