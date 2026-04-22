import React, { useState, useCallback } from "react";
import {
  View,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
} from "react-native";
import { useMushafPage } from "../hooks/useMushafPage";
import { PageImage } from "./PageImage";
import { AyahHighlight } from "./AyahHighlight";
import { isPointInRect } from "../utils/coordinates";
import { useReaderStore } from "../../quran/hook/useReaderStore";

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
    uiVisible 
  } = useReaderStore();

  const { imageUri, scaledBboxes, loading } = useMushafPage(
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
    <View  className='flex-1 bg-white'>
      <TouchableWithoutFeedback 
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={300}
      >
        <View className='flex-1 relative'>
          {/* Layer 1: The Mushaf Image */}
          <PageImage 
            uri={imageUri} 
            onLayout={handleLayout} 
           
          />
          
          {/* Layer 2: The Highlight Overlay */}
          {!loading && scaledBboxes.map((bbox, index) => {
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
    </View>
  );
});

MushafPage.displayName = "MushafPage";
