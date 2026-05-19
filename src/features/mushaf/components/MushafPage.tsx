import React, { useState, useCallback } from "react";
import {
  View,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { useMushafPage } from "../hooks/useMushafPage";
import { PageImage } from "./PageImage";
import { AyahHighlight } from "./AyahHighlight";
import { findAyahAtPoint } from "../utils/bboxGrouping";
import { useReaderStore } from "../../quran/hooks/useReaderStore";

interface MushafPageProps {
  pageNumber: number;
}

export const MushafPage: React.FC<MushafPageProps> = React.memo(({ pageNumber }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { selectedAyah, setSelectedAyah, playingAyah, toggleUI } = useReaderStore();

  const { imageUri, ayahRegions, loading, retry } = useMushafPage(
    pageNumber,
    dimensions.width,
    dimensions.height,
    "contain",
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  }, []);

  const handleLongPress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
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

  return (
    <View className="flex-1 bg-white" onLayout={handleLayout}>
      {showBlockingSpinner ? (
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator color="#0d9488" size="small" />
        </View>
      ) : !imageUri ? (
        <View className="flex-1 items-center justify-center p-6 bg-slate-50">
          <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
          <Text className="text-slate-800 text-base mt-4">
            Page {pageNumber} not downloaded
          </Text>
          <Text className="text-slate-400 text-xs text-center mt-1 mb-6 px-6">
            You need an internet connection to download this page, or you can pre-download all pages.
          </Text>
          <TouchableOpacity
            onPress={retry}
            style={{ backgroundColor: "#0d9488" }}
            className="px-6 py-3 rounded-full flex-row items-center shadow-sm active:opacity-90"
          >
            <Ionicons
              name="download-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white">Tap to Download</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableWithoutFeedback
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={300}
        >
          <View className="flex-1 relative">
            <PageImage uri={imageUri} onLayout={() => {}} />

            {loading && (
              <View
                pointerEvents="none"
                className="absolute top-3 right-3 bg-white/80 rounded-full px-2 py-1"
              >
                <ActivityIndicator color="#0d9488" size="small" />
              </View>
            )}

            {ayahRegions.map((region) => {
              const isPlaying = playingAyah === region.verseKey;
              const isSelected =
                selectedAyah?.sura === region.sura && selectedAyah?.ayah === region.ayah;

              let type: "selected" | "playing" | "none" = "none";
              if (isPlaying) type = "playing";
              else if (isSelected) type = "selected";

              return region.rects.map((rect, index) => (
                <AyahHighlight
                  key={`${region.verseKey}-${index}`}
                  rect={rect}
                  type={type}
                />
              ));
            })}
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
});

MushafPage.displayName = "MushafPage";
