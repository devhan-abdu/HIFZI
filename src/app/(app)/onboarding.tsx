import {
  View,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/src/components/common/ui/Text";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
  FadeIn,
  SlideInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height, width } = Dimensions.get("window");

const PRIMARY = "#1e5a54";
const PRIMARY_LIGHT = "#2a7f77";
const BG_DARK = "#333535";
const CARD_BG = "#F8FAFC"; // Light background for contrast
const BORDER_COLOR = "#E2E8F0";

type JourneyOption = "hifz" | "muraja";

const OPTIONS: {
  type: JourneyOption;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  route: string;
}[] = [
  {
    type: "hifz",
    iconName: "book-outline",
    title: "I'm memorizing new pages",
    subtitle: "Start your Hifz plan",
    description:
      "Build a structured, page-by-page memorization plan tailored to your pace.",
    route: "/(app)/hifz/create-hifz-plan",
  },
  {
    type: "muraja",
    iconName: "refresh-outline",
    title: "I have Hifz to maintain",
    subtitle: "Set up Muraja schedule",
    description:
      "Keep what you've memorized strong with an automated revision system.",
    route: "/(app)/muraja/create-muraja-plan",
  },
];

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
  const selectionProgress = useSharedValue(selected ? 1 : 0);

  selectionProgress.value = withTiming(selected ? 1 : 0, { duration: 250 });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [BORDER_COLOR, PRIMARY]
    ),
    shadowColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["rgba(0,0,0,0)", "rgba(30,90,84,0.2)"]
    ),
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: selected ? 8 : 2,
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["#FFFFFF", "#F0Fdfa"] // white to light teal
    ),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0, { duration: 200 }),
    transform: [{ scale: withSpring(selected ? 1 : 0.6) }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 0 : 1, { duration: 200 }),
    transform: [{ scale: withSpring(selected ? 0.6 : 1) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [BORDER_COLOR, PRIMARY]
    ),
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["#F1F5F9", "rgba(30,90,84,0.1)"]
    ),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
    onPress();
  }, [onPress, scale]);

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[animatedStyle]}
        className="w-full rounded-xl border p-5" // Fully rounded for the option card itself
      >
        <View className="flex-row items-center">
          {/* Icon */}
          <Animated.View
            style={[badgeStyle]}
            className="mr-4 h-14 w-14 items-center justify-center rounded-full border" // Fully rounded icon container
          >
            <Ionicons
              name={option.iconName}
              size={26}
              color={selected ? PRIMARY : "#64748b"}
            />
          </Animated.View>

          {/* Text */}
          <View className="flex-1 justify-center">
            <Text className={`text-base mb-1 ${selected ? "text-primary" : "text-text"}`}>
              {option.title}
            </Text>
            <Text className="text-xs text-muted">
              {option.subtitle}
            </Text>
          </View>

          {/* Icons container */}
          <View className="w-7 h-7 items-center justify-center ml-2">
            <Animated.View style={[chevronStyle]} className="absolute">
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#94a3b8"
              />
            </Animated.View>

            <Animated.View
              style={[checkStyle]}
              className="absolute w-6 h-6 rounded-full items-center justify-center"
            >
              <LinearGradient
                colors={[PRIMARY_LIGHT, PRIMARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full h-full rounded-full items-center justify-center"
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* Description — only when selected */}
        {selected && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="mt-4 border-t pt-4"
            style={{ borderTopColor: "rgba(30,90,84,0.1)" }}
          >
            <Text className="text-[13px] leading-5 text-muted">
              {option.description}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function OnboardingBridge() {
  const [selected, setSelected] = useState<JourneyOption | null>(null);
  const insets = useSafeAreaInsets();

  const buttonProgress = useSharedValue(0);
  buttonProgress.value = withTiming(selected ? 1 : 0, { duration: 300 });

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(buttonProgress.value, [0, 1], [0.5, 1]),
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
    <View className="flex-1" style={{ backgroundColor: BG_DARK }}>
      

      <View
        className="px-6  pb-4 flex-none justify-center overflow-hidden relative"
        style={{ height: height * 0.35, paddingTop: insets.top + 40  }} 
      >
        <LinearGradient
          colors={[PRIMARY, BG_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />

        <View className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-surface opacity-5" />
        <View className="absolute top-32 -right-10 w-48 h-48 rounded-full bg-surface opacity-5" />

        <Animated.View entering={SlideInUp.duration(600)} className="mb-2 z-10 mt-6">
          <Text className="text-white/60 text-xs uppercase tracking-[2px] mb-4">
            Welcome Back
          </Text>
          <Text className="text-white text-4xl leading-tight mb-3">
            Choose Your{"\n"}Path
          </Text>
          <Text className="text-white opacity-80 text-sm leading-6 mt-2 max-w-xs">
            Select what you'd like to focus on in your Quran journey
          </Text>
        </Animated.View>
      </View>

      <View
        className="flex-1 rounded-t-3xl overflow-hidden"
        style={{ backgroundColor: CARD_BG, marginTop: 8 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 32,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text className="text-muted text-xs uppercase tracking-widest mb-6 px-1">
            Choose One to Get Started
          </Text>

          <View className="gap-y-4 mb-4">
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

          <View className="mt-auto pt-8">
            <Text className="text-muted text-xs text-center mb-5 px-2">
              You can update this anytime in your settings
            </Text>

            <Pressable
              onPress={handleContinue}
              disabled={!selected}
              className="active:opacity-75"
            >
              <Animated.View style={[buttonStyle]}>
                <LinearGradient
                  colors={
                    selected
                      ? [PRIMARY_LIGHT, PRIMARY]
                      : ["#E2E8F0", "#E2E8F0"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full h-14 rounded-[60px] items-center justify-center flex-row"
                >
                  <Animated.Text
                    style={{ color: selected ? "#FFFFFF" : "#94A3B8" }}
                    className="text-base font-semibold "
                  >
                    Continue
                  </Animated.Text>

                  <Animated.View style={[iconStyle]} className="ml-2">
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={selected ? "#FFFFFF" : "#94A3B8"}
                    />
                  </Animated.View>
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
