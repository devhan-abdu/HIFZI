import React from "react";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import Svg, { Circle, G } from "react-native-svg";

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  currentSurah?: string;
  remainingPages?: number;
  variant?: "primary" | "white";
}

export default function HifzOverViewCard({
  progress = 0,
  size = 135,
  strokeWidth = 10,
  currentSurah = "Al-Baqarah",
  remainingPages = 0,
  variant = "primary",
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  const isWhite = variant === "white";

  const trackColor = isWhite ? "#f1f5f9" : "rgba(255, 255, 255, 0.15)";
  const progressColor = isWhite ? "#276359" : "#ffffff";

  const labelColor = isWhite ? "text-slate-400" : "text-white/50";
  const mainTextColor = isWhite ? "text-slate-900" : "text-white";
  const badgeBg = isWhite ? "bg-slate-100" : "bg-white/20";
  const badgeText = isWhite ? "text-slate-600" : "text-white";
  const badgeBorder = isWhite ? "border-slate-200" : "border-white/10";

  return (
    <View
      className="relative items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <View className="absolute inset-0 items-center justify-center px-4">
        <Text
          className={`${labelColor}  text-[7px] uppercase tracking-[2px] mb-0.5`}
        >
          Progress
        </Text>

        <Text
          className={`${mainTextColor} text-2xl  tracking-tighter leading-none`}
        >
          {Math.round(progress)}%
        </Text>

        <View
          className={`h-[1px] w-8 my-1.5 ${isWhite ? "bg-slate-100" : "bg-white/20"}`}
        />

        <Text
          numberOfLines={1}
          className={`${mainTextColor} text-[10px]  uppercase tracking-tight text-center`}
        >
          {currentSurah}
        </Text>

        <View
          className={`mt-2 ${badgeBg} px-2.5 py-0.5 rounded-full border ${badgeBorder}`}
        >
          <Text
            className={`${badgeText}  text-[7px] uppercase tracking-widest`}
          >
            {remainingPages} Left
          </Text>
        </View>
      </View>
    </View>
  );
}
