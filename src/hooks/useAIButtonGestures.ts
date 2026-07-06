import { useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import {
  AI_BUTTON_SIZE,
  AI_BUTTON_EDGE_MARGIN,
  AI_BUTTON_POSITION_KEY,
  TAB_BAR_HEIGHT,
} from "../components/navigation/constants";

export function useAIButtonGestures(hideTabs: boolean) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const defaultY =
    SCREEN_H -
    (hideTabs
      ? Math.max(insets.bottom, 8) + 24
      : TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 88) -
    AI_BUTTON_SIZE;

  const buttonX = useSharedValue(
    SCREEN_W - AI_BUTTON_SIZE - AI_BUTTON_EDGE_MARGIN,
  );
  const buttonY = useSharedValue(defaultY);

  const minY = insets.top + 10;
  const maxY = 
    SCREEN_H -
    AI_BUTTON_SIZE -
    (hideTabs
      ? Math.max(insets.bottom, 8) + 10
      : TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 20);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(AI_BUTTON_POSITION_KEY);
        if (saved) {
          const { side, y } = JSON.parse(saved);
          buttonX.value =
            side === "left"
              ? AI_BUTTON_EDGE_MARGIN
              : SCREEN_W - AI_BUTTON_SIZE - AI_BUTTON_EDGE_MARGIN;
          buttonY.value = Math.min(Math.max(y, minY), maxY);
        }
      } catch {
        // Silent fail
      }
    })();
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: buttonX.value,
    top: buttonY.value,
  }));

  const savePosition = (x: number, y: number) => {
    const side = x < SCREEN_W / 2 ? "left" : "right";
    AsyncStorage.setItem(
      AI_BUTTON_POSITION_KEY,
      JSON.stringify({ side, y }),
    ).catch(() => {});
  };

  const openAiChat = () => router.push("/(app)/ai-chat" as never);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      buttonX.value = e.absoluteX - AI_BUTTON_SIZE / 2;
      buttonY.value = Math.min(
        Math.max(e.absoluteY - AI_BUTTON_SIZE / 2, minY),
        maxY,
      );
    })
    .onEnd(() => {
      const snapToRight = buttonX.value + AI_BUTTON_SIZE / 2 > SCREEN_W / 2;
      buttonX.value = withSpring(
        snapToRight
          ? SCREEN_W - AI_BUTTON_SIZE - AI_BUTTON_EDGE_MARGIN
          : AI_BUTTON_EDGE_MARGIN,
        { damping: 16 },
      );
      runOnJS(savePosition)(
        snapToRight
          ? SCREEN_W - AI_BUTTON_SIZE - AI_BUTTON_EDGE_MARGIN
          : AI_BUTTON_EDGE_MARGIN,
        buttonY.value,
      );
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd(() => {
      runOnJS(openAiChat)();
    });

  const aiButtonGesture = Gesture.Race(panGesture, tapGesture);

  return {
    animatedButtonStyle,
    aiButtonGesture,
  };
}
