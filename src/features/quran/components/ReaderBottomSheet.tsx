import React, { useMemo, useRef, useState, useCallback } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { Text } from "@/src/components/common/ui/Text";
import { useReaderStore } from "../hooks/useReaderStore";
import { QariList } from "./SheetViews/QariList.tsx";
import { animatedIndex } from "./readerAnimation";

interface ReaderBottomSheetProps {
  /**
   * All surah (chapter) IDs that appear on the current page.
   * When there is more than one, the user is asked to pick before playback starts.
   */
  chapterIds: number[];
}

export const ReaderBottomSheet = ({ chapterIds }: ReaderBottomSheetProps) => {
  const sheetRef = useRef<BottomSheet>(null);
  const { height } = useWindowDimensions();
  const { selectedAyah, uiMode, uiVisible } = useReaderStore();
  const [sheetIndex, setSheetIndex] = useState(-1);

  /** The chapter that has been confirmed for audio playback */
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [showChapterModal, setShowChapterModal] = useState(false);

  // When the page changes, reset the active chapter if it's no longer on this page,
  // and auto-select when there is only one chapter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (activeChapterId !== null && !chapterIds.includes(activeChapterId)) {
      setActiveChapterId(null);
    }
    if (chapterIds.length === 1 && chapterIds[0] !== undefined) {
      setActiveChapterId(chapterIds[0]);
    }
  }, [chapterIds]); // intentionally omits activeChapterId to avoid reset loops

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

  /** Called when the user taps play in QariList and we need a chapter selected */
  const handleRequestPlay = useCallback(() => {
    if (chapterIds.length <= 1) return; // single chapter — no picker needed
    setShowChapterModal(true);
  }, [chapterIds]);

  // The chapter to pass to QariList — defaults to first chapter if nothing selected
  const resolvedChapterId = activeChapterId ?? chapterIds[0] ?? 1;

  return (
    <>
      {/* Chapter picker modal — only shown on multi-chapter pages */}
      <Modal
        visible={showChapterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChapterModal(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowChapterModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Which Surah to play?</Text>
            <Text style={styles.modalSubtitle}>
              This page contains multiple Surahs
            </Text>
            {chapterIds.map((id) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.chapterOption,
                  activeChapterId === id && styles.chapterOptionActive,
                ]}
                onPress={() => {
                  setActiveChapterId(id);
                  setShowChapterModal(false);
                }}
              >
                <View style={styles.chapterBadge}>
                  <Text style={styles.chapterBadgeText}>{id}</Text>
                </View>
                <Text style={styles.chapterOptionText}>Surah {id}</Text>
                {activeChapterId === id && (
                  <View style={styles.checkDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
          <QariList
            chapterId={resolvedChapterId}
            expanded={sheetIndex > 0}
            // hasMultipleChapters={chapterIds.length > 1}
            // onRequestChapterPicker={handleRequestPlay}
          />
        </BottomSheetView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 20,
  },
  chapterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  chapterOptionActive: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  chapterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chapterBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  chapterOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16a34a",
  },
});
