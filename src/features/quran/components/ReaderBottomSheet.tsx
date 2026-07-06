import React, { useMemo, useRef, useState, useCallback } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReaderStore } from "../hooks/useReaderStore";
import { animatedIndex } from "./readerAnimation";
import { AudioPlayer } from "./SheetViews/AudioPlayer";

interface ReaderBottomSheetProps {
  chapterIds: number[];
}

export const ReaderBottomSheet = ({ chapterIds }: ReaderBottomSheetProps) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { height } = useWindowDimensions();
  const { selectedAyah, uiMode, uiVisible } = useReaderStore();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  React.useEffect(() => {
    if (activeChapterId !== null && !chapterIds.includes(activeChapterId)) {
      setActiveChapterId(null);
    }
    if (chapterIds.length === 1 && chapterIds[0] !== undefined) {
      setActiveChapterId(chapterIds[0]);
    }
  }, [chapterIds, activeChapterId]);

  React.useEffect(() => {
    if (!uiVisible) {
      sheetRef.current?.close();
    } else {
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0);
      });
    }
  }, [uiVisible, selectedAyah]);

  const TAB_BAR_HEIGHT = 58;
  const bottomPadding = Math.max(insets.bottom, 6) ;
  const snapPoints = useMemo(() => [80 + bottomPadding, '60%'], [bottomPadding]);

  const resolvedChapterId = activeChapterId ?? chapterIds[0] ?? 1;
  const sheetBgColor = colorScheme === "dark" ? "#1a211d" : "#ffffff";
  const handleColor = colorScheme === "dark" ? "#334155" : "#e2e8f0";

  const handleExpand = useCallback(() => {
    sheetRef.current?.snapToIndex(1);
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      animatedIndex={animatedIndex}
      enablePanDownToClose={false}
      onChange={(index) => {
        if (index < 0) useReaderStore.getState().hideUI();
      }}
      backgroundStyle={{ backgroundColor: sheetBgColor }}
      handleIndicatorStyle={{ backgroundColor: handleColor }}
    >
      <BottomSheetView style={{ flex: 1, paddingBottom: bottomPadding }}>
        <AudioPlayer chapterId={resolvedChapterId} onExpand={handleExpand} />
      </BottomSheetView>
    </BottomSheet>
  );
};
