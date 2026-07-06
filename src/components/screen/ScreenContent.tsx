import { ReactNode, useRef, useState, useCallback } from "react";
import {
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenContent({ children }: { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const hideTabs =
    pathname.includes("/quran/reader") ||
    pathname.includes("/onboarding") ||
    pathname.includes("/evaluation") ||
    pathname.includes("/plan-completion") ||
    pathname.includes("/journey");

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

      const paddingToBottom = 40;

      const isBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      setIsAtBottom(isBottom);
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingVertical: 16,
        paddingBottom: hideTabs
          ? Math.max(insets.bottom, 16) + 16
          : 70 + Math.max(insets.bottom, 10) + 24, // Account for floating tab bar if visible
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (isAtBottom) {
          scrollToBottom();
        }
      }}
    >
      {/* 🔥 THIS WRAP FIXES YOUR CRASH */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>{children}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
}

export function ScreenFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const hideTabs =
    pathname.includes("/quran/reader") ||
    pathname.includes("/onboarding") ||
    pathname.includes("/evaluation") ||
    pathname.includes("/plan-completion") ||
    pathname.includes("/journey");

  const bottomPadding = hideTabs
    ? Math.max(insets.bottom, 16)
    : 70 + Math.max(insets.bottom, 10) + 12; 

  return (
    <View
      style={{
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: bottomPadding,
        borderTopWidth: 1,
      }}
      className="bg-background border-border"
    >
      {children}
    </View>
  );
}
