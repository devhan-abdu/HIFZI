import React, { useCallback } from "react";
import { View, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReaderStore } from "../hooks/useReaderStore";
import { useBookmarks } from "../hooks/useBookmarks";
import { PageData } from "../type";
import { TranslationSelectorPanel } from "./TranslationSelectorPanel";

interface ReaderHeaderProps {
  pageData?: PageData;
  isDownloadingAll?: boolean;
  downloadProgress?: { downloaded: number; total: number } | null;
  onOpenDownload?: () => void;
}

export default function ReaderHeader({
  pageData,
  isDownloadingAll,
  downloadProgress,
  onOpenDownload,
}: ReaderHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    selectedAyah,
    resetSelection,
    viewMode,
    setViewMode,
    toggleUI,
    uiVisible,
    tallyMode,
    toggleTallyMode,
    translationSelectorOpen,
    toggleTranslationSelector,
    closeTranslationSelector,
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
      closeTranslationSelector();
      // Ensure we go back to the Quran Index specifically
      router.push("/(app)/quran");
    }
  }, [selectedAyah, resetSelection, closeTranslationSelector, router]);

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

    if (!pageData?.page) return;

    if (isPageBookmarked(pageData.page)) {
      void removeBookmark(pageData.page);
    } else {
      void addBookmark(pageData.page);
    }
  };

  if (!uiVisible) return null;

  const surahName = pageData?.name ?? "Loading...";
  const pageLabel = pageData ? `Page ${pageData.page}` : "";

  const isBookmarkedActive =
    selectedAyah ? isBookmarked(`${selectedAyah.sura}:${selectedAyah.ayah}`)
    : pageData ? isPageBookmarked(pageData.page)
    : false;

  return (
    <>
      <View
        style={{ paddingTop: insets.top + 8, zIndex: 100, position: "absolute" }}
        className="top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-100"
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Back / Close */}
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Ionicons
              name={selectedAyah ? "close" : "chevron-back"}
              size={24}
              color="#374151"
            />
          </TouchableOpacity>

          {/* Center title */}
          <TouchableOpacity
            onPress={toggleUI}
            activeOpacity={0.8}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-lg text-gray-800 tracking-tight">{surahName}</Text>
            {isDownloadingAll && downloadProgress ? (
              <View className="flex-row items-center mt-0.5 space-x-1.5">
                <ActivityIndicator size="small" color="#0d9488" style={{ transform: [{ scale: 0.7 }] }} />
                <Text className="text-[10px] text-teal-600 ">
                  Offline Sync ({downloadProgress.downloaded}/{downloadProgress.total})
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-gray-500 mt-0.5">{pageLabel}</Text>
            )}
          </TouchableOpacity>

          {/* Actions */}
          <View className="flex-row items-center space-x-1">
            {/* Translation mode toggle */}
            <TouchableOpacity
              onPress={() => {
                if (viewMode === "translation") closeTranslationSelector();
                setViewMode(viewMode === "mushaf" ? "translation" : "mushaf");
              }}
              className="p-2 bg-slate-50 rounded-full"
            >
              <Ionicons
                name={viewMode === "mushaf" ? "language" : "book"}
                size={20}
                color="#0d9488"
              />
            </TouchableOpacity>

            {/* Translation selector — only in translation mode */}
            {viewMode === "translation" && (
              <TouchableOpacity
                onPress={toggleTranslationSelector}
                className={`p-2 rounded-full ${translationSelectorOpen ? "bg-teal-500" : "bg-slate-50"}`}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={translationSelectorOpen ? "#fff" : "#0d9488"}
                  style={{
                    transform: [{ rotate: translationSelectorOpen ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>
            )}

            {/* Tally counter */}
            <TouchableOpacity
              onPress={toggleTallyMode}
              className={`p-2 rounded-full ${tallyMode ? "bg-teal-500" : "bg-slate-50"}`}
            >
              <Ionicons
                name="analytics"
                size={20}
                color={tallyMode ? "#fff" : "#0d9488"}
              />
            </TouchableOpacity>

            {/* Offline download */}
            <TouchableOpacity
              className="p-2"
              onPress={onOpenDownload}
              disabled={!onOpenDownload}
            >
              <Ionicons
                name={
                  downloadProgress &&
                  downloadProgress.downloaded >= downloadProgress.total
                    ? "cloud-done-outline"
                    : "cloud-download-outline"
                }
                size={22}
                color="#0d9488"
              />
            </TouchableOpacity>

            {/* Bookmark */}
            <TouchableOpacity className="p-2" onPress={handleToggleBookmark}>
              <Ionicons
                name={isBookmarkedActive ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isBookmarkedActive ? "#C7326A" : "#4b5563"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subtle Progress Bar at the bottom of the header */}
        {isDownloadingAll && downloadProgress && (
          <View className="w-full h-1 bg-slate-100">
            <View 
              style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }} 
              className="h-full bg-teal-600" 
            />
          </View>
        )}
      </View>

      {/* Translation selector panel — slides down below header */}
      {viewMode === "translation" && <TranslationSelectorPanel />}
    </>
  );
}
