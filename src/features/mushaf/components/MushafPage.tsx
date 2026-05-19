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
import { isPointInRect } from "../utils/coordinates";
import { useReaderStore } from "../../quran/hooks/useReaderStore";

interface MushafPageProps {
  pageNumber: number;
}

export const MushafPage: React.FC<MushafPageProps> = React.memo(({ pageNumber }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const { 
    selectedAyah, 
    setSelectedAyah, 
    playingAyah, 
    toggleUI,
  } = useReaderStore();

  const { imageUri, scaledBboxes, loading, retry } = useMushafPage(
    pageNumber, 
    dimensions.width, 
    dimensions.height,
    'contain'
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  }, []);

  const handleLongPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    const tappedAyah = scaledBboxes.find(bbox => 
      isPointInRect(locationX, locationY, bbox.scaledRect)
    );

    if (tappedAyah) {
      setSelectedAyah({ sura: tappedAyah.sura, ayah: tappedAyah.ayah });
    }
  };

  const handlePress = () => {
    toggleUI();
  };

  return (
    <View className='flex-1 bg-white' onLayout={handleLayout}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" size="large" />
        </View>
      ) : !imageUri ? (
        <View className="flex-1 items-center justify-center p-6 bg-slate-50">
          <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
          <Text className="text-slate-800  text-base mt-4">
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
            <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white ">Tap to Download</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableWithoutFeedback 
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={300}
        >
          <View className='flex-1 relative'>
            {/* Layer 1: The Mushaf Image */}
            <PageImage 
              uri={imageUri} 
              onLayout={() => {}} 
            />
            
            {/* Layer 2: The Highlight Overlay */}
            {scaledBboxes.map((bbox, index) => {
              const verseKey = `${bbox.sura}:${bbox.ayah}`;
              const isPlaying = playingAyah === verseKey;
              const isSelected = selectedAyah?.sura === bbox.sura && selectedAyah?.ayah === bbox.ayah;
              
              let type: 'selected' | 'playing' | 'none' = 'none';
              if (isPlaying) type = 'playing';
              else if (isSelected) type = 'selected';

              return (
                <AyahHighlight 
                  key={`${verseKey}-${index}`}
                  rect={bbox.scaledRect}
                  type={type}
                />
              );
            })}
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
});

MushafPage.displayName = "MushafPage";
