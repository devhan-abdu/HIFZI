import React, { memo } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageData } from "../type";

interface PageMetaOverlayProps {
  pageData?: PageData;
}

function PageMetaOverlayInner({ pageData }: PageMetaOverlayProps) {
  const insets = useSafeAreaInsets();

  if (!pageData) return null;

  return (
    <View pointerEvents="none" className="absolute inset-0 z-10">
      <View
        className="absolute left-3 right-3 flex-row justify-between items-center"
        style={{ top: insets.top + 6 }}
      >
        <View className="bg-white/82 dark:bg-surface/90 px-2.5 py-1 rounded-full shadow-sm max-w-[55%]">
          <Text
            className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-wider"
            numberOfLines={1}
          >
            {pageData.name}
          </Text>
        </View>

        <View className="bg-white/82 dark:bg-surface/90 px-2.5 py-1 rounded-full shadow-sm">
          <Text className="text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-wider">
            {`Juz' ${pageData.juz}`}
          </Text>
        </View>
      </View>

      {/* ─── Bottom: page number ─── */}
      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: insets.bottom + 8 }}
      >
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/82 dark:bg-surface/90 px-3 py-0.5 rounded-full overflow-hidden shadow-sm">
          {pageData.page}
        </Text>
      </View>
    </View>
  );
}

export const PageMetaOverlay = memo(PageMetaOverlayInner);
