import { ReactNode, useRef, useState, useCallback } from "react";
import {
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from "react-native";

export function ScreenContent({ children }: { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
        paddingBottom: 40,
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
  return (
    <View className="p-4 border-t border-gray-200 bg-white">{children}</View>
  );
}
