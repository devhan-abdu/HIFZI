import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { AI_BUTTON_SIZE } from "./navigation/constants";

interface AIButtonProps {
  visible: boolean;
  gesture: any;
  animatedStyle: any;
  shadowColor: string;
}

export function AIButton({
  visible,
  gesture,
  animatedStyle,
  shadowColor,
}: AIButtonProps) {
  if (!visible) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          animatedStyle,
          { width: AI_BUTTON_SIZE, height: AI_BUTTON_SIZE, zIndex: 200 },
        ]}
      >
        <View
          className="bg-primary rounded-full w-full h-full items-center justify-center"
          style={{
            shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 40,
          }}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
