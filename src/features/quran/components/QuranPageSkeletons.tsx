import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, useWindowDimensions, ActivityIndicator } from "react-native";

function PulseBlock({ className }: { className: string }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View className={className} style={{ opacity }} />;
}

/** Mimics a mushaf spread: margins + subtle “lines” suggesting text blocks */
export function MushafPageSkeleton() {
  const { width, height } = useWindowDimensions();
  const pad = Math.min(20, width * 0.04);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2 - 48;

  return (
    <View className="flex-1 bg-background" style={{ padding: pad }}>
      <View
        className="flex-1 rounded-lg bg-surface overflow-hidden border border-border"
        style={{ minHeight: innerH }}
      >
        <View className="absolute top-4 left-0 right-0 items-center">
          <PulseBlock className="h-2 w-24 rounded-full bg-border" />
        </View>
        <View
          className="flex-1 flex-row justify-between px-6 pt-14 pb-10"
          style={{ gap: innerW * 0.06 }}
        >
          <View className="flex-1 justify-between py-2">
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[92%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[88%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[95%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[80%] rounded-md bg-border self-end" />
          </View>
          <View style={{ width: 1 }} className="bg-surface" />
          <View className="flex-1 justify-between py-2">
            <PulseBlock className="h-3 w-[90%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[85%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[93%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
            <PulseBlock className="h-3 w-[78%] rounded-md bg-border self-end" />
            <PulseBlock className="h-3 w-full rounded-md bg-border" />
          </View>
        </View>
        <View className="absolute bottom-6 left-0 right-0 items-center">
          <PulseBlock className="h-2 w-32 rounded-full bg-teal-100" />
        </View>
      </View>
    </View>
  );
}

function VerseBlockSkeleton() {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 28,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        backgroundColor: "#ffffff",
      }}
    >
      <View style={{ marginBottom: 18 }}>
        <PulseBlock className="h-6 w-20 rounded-lg bg-border" />
      </View>
      <View style={{ alignItems: "flex-end", marginBottom: 24 }}>
        <PulseBlock className="h-4 w-full rounded-md bg-border mb-2" />
        <PulseBlock className="h-4 w-[94%] rounded-md bg-border mb-2" />
        <PulseBlock className="h-4 w-[88%] rounded-md bg-border mb-2" />
        <PulseBlock className="h-4 w-[72%] rounded-md bg-border" />
      </View>
      <PulseBlock className="h-3 w-28 rounded-md bg-teal-50 mb-2" />
      <PulseBlock className="h-3 w-full rounded-md bg-border mb-2" />
      <PulseBlock className="h-3 w-[96%] rounded-md bg-border mb-2" />
      <PulseBlock className="h-3 w-[85%] rounded-md bg-border" />
    </View>
  );
}

/** Mimics translation mode: verse badge + RTL Arabic block + translation lines */
export function TranslationPageSkeleton() {
  return (
    <View className="flex-1 justify-center items-center bg-surface">
      <ActivityIndicator size="large" color="#0d9488" />
    </View>
  );
}
