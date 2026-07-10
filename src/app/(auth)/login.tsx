import {
  View,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  } from "react-native";
import { useSession } from "@/src/hooks/useSession";
import { router } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HookSlide } from "@/src/features/onboarding/slides/HookSlide";
import { ProblemSlide } from "@/src/features/onboarding/slides/ProblemSlide";
import { HifzSlide } from "@/src/features/onboarding/slides/HifzSlide";
import { HeatmapSlide } from "@/src/features/onboarding/slides/HeatmapSlide";
import { TrustSlide } from "@/src/features/onboarding/slides/TrustSlide";
import { NotificationSlide } from "@/src/features/onboarding/slides/NotificationSlide";
import { DotIndicator } from "@/src/features/onboarding/DotIndicator";

const { width } = Dimensions.get("window");
const HAS_SEEN_KEY = "@hifzi/hasSeenIntro";
const SLIDE_COUNT = 6;

const SLIDES = [
  { key: "hook", component: HookSlide, dark: true },
  { key: "problem", component: ProblemSlide, dark: true },
  { key: "hifz", component: HifzSlide, dark: true },
  { key: "heatmap", component: HeatmapSlide, dark: true },
  { key: "notifications", component: NotificationSlide, dark: true },
  { key: "trust", component: TrustSlide, dark: true },
];

export default function IntroScreen() {
  const { session, loading } = useSession();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [initialised, setInitialised] = useState(false);
  const insets = useSafeAreaInsets();

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && session) {
      router.replace("/(app)");
    }
  }, [session, loading]);

  // Check if user has already seen the intro
  useEffect(() => {
    AsyncStorage.getItem(HAS_SEEN_KEY).then((value) => {
      if (value === "true") {
        // Jump to last slide (login)
        setActiveIndex(SLIDE_COUNT - 1);
        setInitialised(true);
        // Scroll after layout
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: SLIDE_COUNT - 1,
            animated: false,
          });
        }, 50);
      } else {
        setInitialised(true);
      }
    });
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      setActiveIndex(idx);

      // Mark as seen when user reaches the last slide
      if (idx === SLIDE_COUNT - 1) {
        AsyncStorage.setItem(HAS_SEEN_KEY, "true");
      }
    },
    []
  );

  if (!initialised) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#276359" }}>
      

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const SlideComponent = item.component;
          return (
            <SlideComponent
              onNext={() => {
                if (index < SLIDE_COUNT - 1) {
                  flatListRef.current?.scrollToIndex({
                    index: index + 1,
                    animated: true,
                  });
                }
              }}
            />
          );
        }}
      />

      {/* Dot indicators — positioned absolutely over slides */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 24, // Reduced from 64 to perfectly balance the slide without stacking on navigation
          left: 0,
          right: 0,
          alignItems: "center",
          // Only show dots on slides 0-3, not on the login slide
          opacity: activeIndex < SLIDE_COUNT - 1 ? 1 : 0,
        }}
        pointerEvents="none"
      >
        <DotIndicator
          count={SLIDE_COUNT - 1}
          activeIndex={activeIndex}
          dark={true}
        />
      </View>
    </View>
  );
}
