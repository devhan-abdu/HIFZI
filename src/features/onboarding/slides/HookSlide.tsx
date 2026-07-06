import React, { useEffect } from "react";
import { View, Dimensions, StatusBar,Text as NormalText } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const AYAH = "وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٖ";

export function HookSlide() {
  const insets = useSafeAreaInsets();
  const ayahScale = useSharedValue(0.96);
  const ayahOpacity = useSharedValue(1);
  const ayahY = useSharedValue(0);
  const transOpacity = useSharedValue(1);
  const tagOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const hintOpacity = useSharedValue(1);

  useEffect(() => {
    // Breathing loop
    ayahScale.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const ayahStyle = useAnimatedStyle(() => ({
    opacity: ayahOpacity.value,
    transform: [{ translateY: ayahY.value }, { scale: ayahScale.value }],
  }));
  const transStyle = useAnimatedStyle(() => ({ opacity: transOpacity.value }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  return (
    <View style={{ width, height, overflow: "hidden" }} className="bg-primary">
      <StatusBar barStyle="light-content" />

      <View
        style={{
          position: "absolute",
          top: -90,
          right: -90,
          width: 320,
          height: 320,
          borderRadius: 160,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 220,
          height: 220,
          borderRadius: 110,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      />
      {/* Filled accent arc glow */}
      <View
        style={{
          position: "absolute",
          top: -110,
          right: -110,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      />

      {/* Top badge */}
      <Animated.View style={[tagStyle, { position: "absolute", top: 56, left: 28 }]}>
        <View className="flex-row items-center gap-x-2">
          <View className="w-5 h-[1px] bg-surface/40" />
          <Text className="text-white/50 text-[10px] tracking-[3px] uppercase">
            Powered by Quran.com
          </Text>
        </View>
      </Animated.View>

      {/* Center — Ayah block */}
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ paddingTop: 120, paddingBottom: 160 }}
      >
        <Animated.View style={ayahStyle} className="items-center w-full">
          <NormalText
            style={{
              fontFamily: "Uthman",
              fontSize: 32,
              lineHeight: 50,
              color: "#FFFFFF",
              textAlign: "center",
              writingDirection: "rtl",
            }}
          >
            {AYAH}
          </NormalText>
        </Animated.View>

        <Animated.View style={[transStyle, { marginTop: 20 }]} className="items-center px-6">
          <View className="w-10 h-[1px] bg-surface/25 mb-4" />
          <Text className="text-white/65  text-center leading-6">
            "And We have certainly made the Quran easy to remember"
          </Text>
          <Text className="text-white/35 text-xs text-center mt-2 tracking-widest uppercase">
            Al-Qamar · 54:17
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[logoStyle, { position: "absolute", bottom: 68 + Math.max(insets.bottom, 12), left: 0, right: 0 }]}
        className="items-center"
      >
        <Text className="text-white text-xl">
          Hifzi
        </Text>
        <Text className="text-white/40 text-xs tracking-[3px] uppercase mt-1">
          Your Quran Companion
        </Text>
      </Animated.View>

      <Animated.View
        style={[hintStyle, { position: "absolute", bottom: 52 + Math.max(insets.bottom, 12), left: 0, right: 0 }]}
        className="items-center"
      >
        <Text className="text-white/30 text-xs tracking-widest">swipe to begin →</Text>
      </Animated.View>
    </View>
  );
}
