import React, { useCallback } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReaderStore } from "../hook/useReaderStore";
import { useBookmarks } from "../hook/useBookmarks";
import { PageData } from "../type";

interface ReaderHeaderProps {
  pageData?: PageData;
}

export default function ReaderHeader({ pageData }: ReaderHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    selectedAyah,
    resetSelection,
    viewMode,
    setViewMode,
    toggleUI,
    uiVisible,
  } = useReaderStore();

  const {
    isPageBookmarked,
    isBookmarked,
    addBookmark,
    addBookmarkByVerseKey,
    removeBookmark,
    removeBookmarkByVerseKey,
  } = useBookmarks();

  const handleBack = useCallback(() => {
    if (selectedAyah) {
      resetSelection();
    } else {
      router.back();
    }
  }, [selectedAyah, resetSelection, router]);

  const handleToggleBookmark = async () => {
    if (selectedAyah) {
      const verseKey = `${selectedAyah.sura}:${selectedAyah.ayah}`;
      if (isBookmarked(verseKey)) {
        void removeBookmarkByVerseKey(verseKey);
      } else {
        void addBookmarkByVerseKey(verseKey);
      }
      return;
    }

    if (!pageData?.page) {
      return;
    }

    if (isPageBookmarked(pageData.page)) {
      void removeBookmark(pageData.page);
    } else {
      void addBookmark(pageData.page);
    }
  };

  if (!uiVisible) return null;

  const surahName = pageData?.name ?? "Loading...";
  const pageLabel = pageData ? `Page ${pageData.page}` : "";

  // Determine active state for the icon
  const isBookmarkedActive =
    selectedAyah ? isBookmarked(`${selectedAyah.sura}:${selectedAyah.ayah}`)
    : pageData ? isPageBookmarked(pageData.page)
    : false;

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        zIndex: 100,
        position: "absolute",
      }}
      className="top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-100"
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Left: Back/Close */}
        <TouchableOpacity onPress={handleBack} className="p-2">
          <Ionicons
            name={selectedAyah ? "close" : "chevron-back"}
            size={24}
            color="#374151"
          />
        </TouchableOpacity>

        {/* Center: Title & Info */}
        <TouchableOpacity
          onPress={toggleUI}
          activeOpacity={0.8}
          className="flex-1 items-center justify-center"
        >
          <Text className="text-lg font-bold text-gray-800 tracking-tight">
            {surahName}
          </Text>
          <Text className="text-xs text-gray-500 font-medium mt-0.5">
            {pageLabel}
          </Text>
        </TouchableOpacity>

        {/* Right: Actions */}
        <View className="flex-row items-center space-x-2">
          {/* View Mode Switcher */}
          <TouchableOpacity
            onPress={() =>
              setViewMode(viewMode === "mushaf" ? "translation" : "mushaf")
            }
            className="p-2 bg-slate-50 rounded-full"
          >
            <Ionicons
              name={viewMode === "mushaf" ? "language" : "book"}
              size={20}
              color="#0d9488"
            />
          </TouchableOpacity>

          {/* Bookmark Toggle */}
          <TouchableOpacity className="p-2" onPress={handleToggleBookmark}>
            <Ionicons
              name={isBookmarkedActive ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isBookmarkedActive ? "#C7326A" : "#4b5563"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
