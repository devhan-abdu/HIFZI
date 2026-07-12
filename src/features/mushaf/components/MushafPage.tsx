import React, { useState, useCallback } from "react";
import {
  View,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { useMushafPage } from "../hooks/useMushafPage";
import { PageImage } from "./PageImage";
import { AyahHighlight } from "./AyahHighlight";
import { findAyahAtPoint } from "../utils/bboxGrouping";
import { useReaderStore } from "../../quran/hooks/useReaderStore";
import { PageData } from "../../quran/type";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MushafPageProps {
  pageNumber: number;
  isActive: boolean;
  pageData?: PageData;
}

export const MushafPage: React.FC<MushafPageProps> = React.memo(
  ({ pageNumber, isActive, pageData }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const insets = useSafeAreaInsets();

    const { selectedAyah, setSelectedAyah, playingAyah, toggleUI } =
      useReaderStore();

    const { imageUri, ayahRegions, loading, retry } = useMushafPage(
      pageNumber,
      dimensions.width,
      dimensions.height,
      "contain",
      isActive,
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    }, []);

    const handleLongPress = (event: {
      nativeEvent: { locationX: number; locationY: number };
    }) => {
      const { locationX, locationY } = event.nativeEvent;
      const tapped = findAyahAtPoint(ayahRegions, locationX, locationY);
      if (tapped) {
        setSelectedAyah({ sura: tapped.sura, ayah: tapped.ayah });
      }
    };

    const handlePress = () => {
      toggleUI();
    };

    const showBlockingSpinner = loading && !imageUri;

    const imageAspect = 0.65;
    const renderedImageHeight =
      dimensions.width > 0 ? dimensions.width / imageAspect : 0;
    const letterBoxHeight =
      dimensions.height > 0 ?
        Math.max(0, (dimensions.height - renderedImageHeight) / 2)
      : 0;

    const topOffset = Math.max(insets.top + 8, letterBoxHeight - 48);
    const bottomOffset = Math.max(insets.bottom + 8, letterBoxHeight - 34);
    const activeSelectedAyah = isActive ? selectedAyah : null;
    const activePlayingAyah = isActive ? playingAyah : null;

    return (
      <View className="flex-1 bg-background" onLayout={handleLayout}>
        {showBlockingSpinner ?
          <View className="flex-1" />
        : !imageUri ?
          <View className="flex-1 items-center justify-center p-6 bg-background">
            <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
            <Text className="text-text text-base mt-4">
              Could not load page {pageNumber}
            </Text>
            <Text className="text-muted text-xs text-center mt-1 mb-6 px-6">
              Connect to the internet to fetch this page, or download all mushaf
              pages from Quran → Offline reading (optional).
            </Text>
            <TouchableOpacity
              onPress={retry}
              style={{ backgroundColor: "#0d9488" }}
              className="px-6 py-3 rounded-full flex-row items-center shadow-sm active:opacity-90"
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white">Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        : <TouchableWithoutFeedback
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
          >
            <View className="flex-1 relative">
              {pageData && dimensions.height > 0 && (
                <View
                  className="flex-row justify-between px-5 absolute w-full z-10"
                  style={{ top: topOffset }}
                  pointerEvents="none"
                >
                  <Text className="text-base text-muted font-medium tracking-wider">
                    {pageData.name}
                  </Text>
                  <Text className="text-base text-muted font-medium tracking-wider">
                    Juz' {pageData.juz}
                  </Text>
                </View>
              )}

              <PageImage uri={imageUri} onLayout={() => {}} />

              {pageData && dimensions.height > 0 && (
                <View
                  className="items-center absolute w-full z-10"
                  style={{ bottom: bottomOffset }}
                  pointerEvents="none"
                >
                  <Text className="text-base text-muted font-medium">
                    {pageData.page}
                  </Text>
                </View>
              )}

              {/* {ayahRegions.map((region) => {
                const isPlaying = activePlayingAyah === region.verseKey;
                const isSelected =
                  activeSelectedAyah?.sura === region.sura &&
                  activeSelectedAyah?.ayah === region.ayah;

                let type: "selected" | "playing" | "none" = "none";
                if (isPlaying) type = "playing";
                else if (isSelected) type = "selected";

                if (type === "none") return null;

                return region.rects.map((rect, index) => (
                  <AyahHighlight
                    key={`${region.verseKey}-${index}`}
                    rect={rect}
                    type={type}
                  />
                ));
              })} */}
            </View>
          </TouchableWithoutFeedback>
        }
      </View>
    );
  },
);

MushafPage.displayName = "MushafPage";
