import React, { useMemo, useRef, useState } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useWindowDimensions } from "react-native";

import { useReaderStore } from "../hooks/useReaderStore";
import { AyahActionMenu } from "./SheetViews/AyahActionMenu";
import { QariList } from "./SheetViews/QariList.tsx";
import { animatedIndex } from "./readerAnimation";

export const ReaderBottomSheet = ({ chapterId }: { chapterId: number }) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { height } = useWindowDimensions();
  const { selectedAyah, uiMode, uiVisible } = useReaderStore();
  const [sheetIndex, setSheetIndex] = useState(-1);

  const isAyahSelected = !!selectedAyah;
  const showAyahMenu = isAyahSelected && uiMode !== "recitation";

  React.useEffect(() => {
    if (!uiVisible) {
      sheetRef.current?.close();
    } else {
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0);
      });
    }
  }, [uiVisible, isAyahSelected]);

  const snapPoints = useMemo(() => {
    if (showAyahMenu) return ["45%", "85%"];
    return [200, "65%"];
  }, [showAyahMenu]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={true}
      maxDynamicContentSize={Math.round(height * 0.85)}
      animatedIndex={animatedIndex}
      enablePanDownToClose={true}
      onChange={setSheetIndex}
      onClose={() => useReaderStore.getState().hideUI()}
      backgroundStyle={{ backgroundColor: "#fff" }}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1" }}
    >
      <BottomSheetView className="bg-white py-2 px-4">
        <QariList chapterId={chapterId} expanded={sheetIndex > 0} />
      </BottomSheetView>
    </BottomSheet>
  );
};
