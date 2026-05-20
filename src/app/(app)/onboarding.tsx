import { View, Pressable, ScrollView, StatusBar, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

const PRIMARY = "#276359";
const SLATE_DISABLED = "#F1F5F9"; // Lighter than before for a cleaner disabled state
const SLATE_TEXT = "#94A3B8";
const CARD_BORDER = "#E2E8F0";
const ICON_BADGE_BG = "#F7FAF8";

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
    description: "Build a structured, page-by-page memorization plan tailored to your pace.",
    route: "/(app)/hifz/create-hifz-plan",
  },
  {
    type: "muraja",
    iconName: "refresh-outline",
    title: "I have Hifz to maintain",
    subtitle: "Set up Muraja schedule",
    description: "Keep what you've memorized strong with an automated revision system.",
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
      [CARD_BORDER, PRIMARY]
    ),
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
      [CARD_BORDER, "rgba(39,99,89,0.22)"]
    ),
    backgroundColor: ICON_BADGE_BG,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
    onPress();
  }, [onPress, scale]);

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[animatedStyle]}
        className="w-full rounded-2xl border-2 p-5"
      >
        <View className="flex-row items-center">
          {/* Icon */}
          <Animated.View
            style={[badgeStyle]}
            className="mr-3.5 h-12 w-12 items-center justify-center rounded-full border"
          >
            <Ionicons name={option.iconName} size={22} color={PRIMARY} />
          </Animated.View>

          {/* Text */}
          <View className="flex-1 justify-center">
            <Text className="text-base  text-slate-800 mb-0.5">
              {option.title}
            </Text>
            <Text className="text-xs text-slate-500">
              {option.subtitle}
            </Text>
          </View>

          {/* Icons container */}
          <View className="w-7 h-7 items-center justify-center ml-2">
            <Animated.View style={[chevronStyle]} className="absolute">
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </Animated.View>
            
            <Animated.View
              style={[checkStyle]}
              className="absolute w-6 h-6 rounded-full bg-primary items-center justify-center"
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </Animated.View>
          </View>
        </View>

        {/* Description — only when selected */}
        {selected && (
          <Text className="mt-3 border-t border-slate-100 pt-3 text-[13px] leading-5 text-slate-500">
            {option.description}
          </Text>
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
    backgroundColor: interpolateColor(
      buttonProgress.value,
      [0, 1],
      [SLATE_DISABLED, PRIMARY]
    ),
  }));

  const buttonTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      buttonProgress.value,
      [0, 1],
      [SLATE_TEXT, "#FFFFFF"]
    ),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: buttonProgress.value,
    transform: [{ translateX: withSpring(selected ? 0 : -10) }]
  }));

  const handleContinue = useCallback(() => {
    if (!selected) return;
    const option = OPTIONS.find((o) => o.type === selected);
    if (option) router.push(option.route as any);
  }, [selected]);

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle="light-content" backgroundColor="#276359" />
      
      {/* Green Hero Area */}
      <View 
        className="px-6 flex-none justify-center overflow-hidden" 
        style={{ height: height * 0.42, paddingTop: insets.top }}
      >
        {/* Decorative elements */}
        <View className="absolute -top-10 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <View className="absolute top-24 -right-8 w-40 h-40 rounded-full bg-white/10" />

        <View className="mb-8">
          <Text className="text-white/70 text-xs uppercase tracking-[3px] mb-3 font-medium">
            Your Quran Journey
          </Text>
          <Text className="text-white text-[40px]  leading-[44px] tracking-tight">
            Where are{"\n"}you today?
          </Text>
          <Text className="text-white/70 text-sm mt-3 leading-6">
            Let&apos;s build the right plan for you
          </Text>
        </View>
      </View>

      {/* White Rounded Card Sheet */}
      <View className="flex-1 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-10" style={{ marginTop: -24 }}>
        {/* Drag handle bar */}
        <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mt-3 mb-6" />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text className="text-[11px] uppercase tracking-[2px] text-slate-400 font-medium mb-5 px-1">
            Choose Your Path
          </Text>

          {/* Option cards */}
          <View className="gap-y-3.5 mb-2">
            {OPTIONS.map((option) => (
              <OptionCard
                key={option.type}
                option={option}
                selected={selected === option.type}
                onPress={() => setSelected(option.type)}
              />
            ))}
          </View>

          <View className="mt-auto pt-6">
            <Text className="text-[13px] text-slate-400 text-center mb-4">
              You can change this anytime
            </Text>

            {/* CTA Button */}
            <Pressable
              onPress={handleContinue}
              disabled={!selected}
              className="active:opacity-90"
            >
              <Animated.View
                style={[buttonStyle]}
                className="w-full h-14 rounded-2xl items-center justify-center flex-row shadow-sm"
              >
                <Animated.Text
                  style={[buttonTextStyle, { fontFamily: "Rosemary" }]}
                  className="text-base  tracking-wide"
                >
                  Continue
                </Animated.Text>
                
                <Animated.View style={[iconStyle]} className="ml-1 mt-0.5">
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
