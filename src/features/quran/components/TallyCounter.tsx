import React, { useState, useEffect } from "react";
import { View, Pressable, Animated } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface TallyCounterProps {
  onCountsChange?: (counts: { mistakes: number; hesitations: number }) => void;
  visible: boolean;
}

export const TallyCounter = ({ onCountsChange, visible }: TallyCounterProps) => {
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const opacity = useState(new Animated.Value(0))[0];
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible]);

  useEffect(() => {
    onCountsChange?.({ mistakes, hesitations });
  }, [mistakes, hesitations]);

  const handlePress = (type: "M" | "H") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === "M") setMistakes((s) => s + 1);
    else setHesitations((s) => s + 1);
  };

  if (!shouldRender) return null;

  return (
    <Animated.View 
      style={{ opacity }}
      pointerEvents="box-none"
      className="absolute right-4 bottom-32 flex-col gap-y-4 items-center justify-center"
    >
      <View className="bg-black/60 rounded-3xl p-2 items-center backdrop-blur-md border border-white/20">
        <Pressable
          onPress={() => handlePress("M")}
          className="w-14 h-14 bg-red-500/80 rounded-2xl items-center justify-center active:scale-95 mb-2"
        >
          <Text className="text-white  text-lg">M</Text>
        </Pressable>
        <Text className="text-white text-xs ">{mistakes}</Text>
      </View>

      <View className="bg-black/60 rounded-3xl p-2 items-center backdrop-blur-md border border-white/20">
        <Pressable
          onPress={() => handlePress("H")}
          className="w-14 h-14 bg-amber-500/80 rounded-2xl items-center justify-center active:scale-95 mb-2"
        >
          <Text className="text-white  text-lg">H</Text>
        </Pressable>
        <Text className="text-white text-xs ">{hesitations}</Text>
      </View>
    </Animated.View>
  );
};
