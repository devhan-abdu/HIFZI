import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { TAB_BAR_HEIGHT } from "./constants";

interface TabBarGradientProps {
  visible: boolean;
  colors: {
    fadeTop: string;
    fadeMid: string;
    fadeStrong: string;
    fadeBottom: string;
  };
}

export function TabBarGradient({ visible, colors }: TabBarGradientProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        colors.fadeTop,
        colors.fadeMid,
        colors.fadeStrong,
        colors.fadeBottom,
      ]}
      locations={[0, 0.55, 0.85, 1]}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: 110,
        bottom: Math.max(insets.bottom, 8) + 8 + TAB_BAR_HEIGHT - 20,
        zIndex: 90,
      }}
    />
  );
}
