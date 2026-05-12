import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageData } from "../type";

interface PageMetaOverlayProps {
  pageData?: PageData;
}

/**
 * Always-visible overlay that shows surah name (top-left),
 * Juz number (top-right), and page number (bottom-center)
 * on top of the Mushaf image.
 *
 * Performance notes:
 *  - React.memo: only re-renders when pageData reference changes
 *  - StyleSheet.create: styles are registered once, no per-render object alloc
 *  - pointerEvents="none": the overlay never intercepts touches
 */
function PageMetaOverlayInner({ pageData }: PageMetaOverlayProps) {
  const insets = useSafeAreaInsets();

  if (!pageData) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 10 },
      ]}
    >
      {/* ─── Top row: Surah name left | Juz number right ─── */}
      <View
        style={[
          styles.topRow,
          { top: insets.top + 6 },
        ]}
      >
        <View style={styles.pill}>
          <Text style={styles.pillText} numberOfLines={1}>
            {pageData.name}
          </Text>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {`Juz' ${pageData.juz}`}
          </Text>
        </View>
      </View>

      {/* ─── Bottom: page number ─── */}
      <View
        style={[
          styles.bottomCenter,
          { bottom: insets.bottom + 8 },
        ]}
      >
        <Text style={styles.pageNumber}>{pageData.page}</Text>
      </View>
    </View>
  );
}

export const PageMetaOverlay = memo(PageMetaOverlayInner);

const styles = StyleSheet.create({
  topRow: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    // subtle shadow so text is readable on any page color
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: "55%",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    letterSpacing: 0.1,
  },
  bottomCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pageNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
});
