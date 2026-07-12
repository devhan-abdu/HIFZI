import {
  View,
  Pressable,
  ImageBackground,
  Dimensions,
  GestureResponderEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/src/components/common/ui/Text";
import { router } from "expo-router";
import { useState, useCallback, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  SlideInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

const { height } = Dimensions.get("window");

const THEME_COLORS = {
  light: { background: "#ffffff", primary: "#276359" },
  dark: { background: "#0f1512", primary: "#22574E" },
};

const SCRIM_CONFIG = {
  light: { heightRatio: 0.5, midAlpha: "40", maxAlpha: "D9" },
  dark: { heightRatio: 0.72, midAlpha: "CC", maxAlpha: "FF" },
};

type JourneyOption = "hifz" | "muraja";

const OPTIONS: {
  type: JourneyOption;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
}[] = [
  {
    type: "hifz",
    iconName: "book-outline",
    title: "Memorizing new pages",
    subtitle: "Start a Hifz plan",
    route: "/(app)/hifz/create-hifz-plan",
  },
  {
    type: "muraja",
    iconName: "refresh-outline",
    title: "Maintaining my Hifz",
    subtitle: "Set up Muraja schedule",
    route: "/(app)/muraja/create-muraja-plan",
  },
];

function PressWave({
  children,
  onPress,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const rippleId = useRef(0);
  const progress = useSharedValue(0);

  const trigger = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      rippleId.current += 1;
      setRipple({ x: locationX, y: locationY, key: rippleId.current });
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });
    },
    [progress],
  );

  const waveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0, 14]) }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={trigger}
      className={className}
      style={{ overflow: "hidden" }}
    >
      {children}
      {ripple && (
        <Animated.View
          key={ripple.key}
          pointerEvents="none"
          style={[
            waveStyle,
            {
              position: "absolute",
              left: ripple.x - 8,
              top: ripple.y - 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#ffffff",
            },
          ]}
        />
      )}
    </Pressable>
  );
}

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: (typeof OPTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0, { duration: 200 }),
    transform: [{ scale: withSpring(selected ? 1 : 0.6) }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 0 : 1, { duration: 200 }),
    transform: [{ scale: withSpring(selected ? 0.6 : 1) }],
  }));

  return (
    <PressWave onPress={onPress} className="w-full rounded-2xl">
      <Animated.View
        style={{ transform: [{ scale: scale.value }] }}
        className={`w-full rounded-2xl p-5 border ${
          selected ? "bg-primary border-primary" : "bg-black/25 border-white/15"
        }`}
      >
        <View className="flex-row items-center">
          <View
            className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${
              selected ? "bg-[#27635926]" : "bg-white/10"
            }`}
          >
            <Ionicons name={option.iconName} size={22} color="#ffffff" />
          </View>

          <View className="flex-1 justify-center">
            <Text
              className={`text-base mb-0.5 ${
                selected ? "text-white" : "text-white"
              }`}
            >
              {option.title}
            </Text>
            <Text className={`text-xs text-white/60 `}>{option.subtitle}</Text>
          </View>

          <View className="w-6 h-6 items-center justify-center ml-2">
            <Animated.View style={[chevronStyle]} className="absolute">
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </Animated.View>
            <Animated.View style={[checkStyle]} className="absolute">
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </PressWave>
  );
}

export default function OnboardingBridge() {
  const [selected, setSelected] = useState<JourneyOption | null>(null);
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const scrim = isDark ? SCRIM_CONFIG.dark : SCRIM_CONFIG.light;

  const buttonProgress = useSharedValue(0);
  buttonProgress.value = withTiming(selected ? 1 : 0, { duration: 300 });

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(buttonProgress.value, [0, 1], [0.45, 1]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: buttonProgress.value,
    transform: [{ translateX: withSpring(selected ? 0 : -10) }],
  }));

  const handleContinue = useCallback(() => {
    if (!selected) return;
    const option = OPTIONS.find((o) => o.type === selected);
    if (option) router.push(option.route as any);
  }, [selected]);

  return (
    <ImageBackground
      source={require("@/assets/images/onboarding-bg.png")}
      resizeMode="cover"
      style={{ flex: 1, width: "100%", height: "100%" }}
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: height * 0.4,
        }}
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0)",
          `${theme.background}${scrim.midAlpha}`,
          `${theme.background}${scrim.maxAlpha}`,
        ]}
        locations={[0, 0.6, 1]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: height * scrim.heightRatio,
        }}
      />

      <View
        className="flex-1"
        style={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Animated.View entering={SlideInUp.duration(600)} className="px-6 py-4">
          <Text className="text-white text-4xl leading-tight mb-2 ">
            Choose your path
          </Text>
          <Text className="text-white/70 text-base leading-5 max-w-[85%]">
            What are you focusing on right now?
          </Text>
        </Animated.View>

        <View className="flex-1 justify-center px-6 mt-12">
          <View className="gap-y-4">
            {OPTIONS.map((option, index) => (
              <Animated.View
                key={option.type}
                entering={SlideInUp.delay(index * 100).duration(500)}
              >
                <OptionCard
                  option={option}
                  selected={selected === option.type}
                  onPress={() => setSelected(option.type)}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        <View className="px-6">
          <PressWave
            onPress={handleContinue}
            disabled={!selected}
            className="rounded-full"
          >
            <Animated.View style={[buttonStyle]}>
              <View className="w-full h-14 rounded-full items-center justify-center flex-row bg-primary">
                <Text className="text-primary-foreground text-base ">
                  Continue
                </Text>
                <Animated.View style={[iconStyle]} className="ml-2">
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </Animated.View>
              </View>
            </Animated.View>
          </PressWave>
        </View>
      </View>
    </ImageBackground>
  );
}
