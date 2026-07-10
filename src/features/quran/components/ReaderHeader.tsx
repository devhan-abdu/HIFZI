import React, { useCallback, useState } from "react";
import { View, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReaderStore } from "../hooks/useReaderStore";
import { useBookmarks } from "../hooks/useBookmarks";
import { PageData } from "../type";
import { TranslationSelectorPanel } from "./TranslationSelectorPanel";
import { countDownloadedPages } from "../services/quranImageService";
import { useMushafBulkDownloadStore } from "../store/mushafBulkDownloadStore";
import { useColorScheme } from "nativewind";

interface ReaderHeaderProps {
  pageData?: PageData;
}

export default function ReaderHeader({ pageData }: ReaderHeaderProps) {
  const { push } = useNavigate();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#e2e8f0" : "#334155";

  const {
    selectedAyah,
    resetSelection,
    viewMode,
    setViewMode,
    toggleUI,
    uiVisible,
    translationSelectorOpen,
    toggleTranslationSelector,
    closeTranslationSelector,
  } = useReaderStore();

  const bulk = useMushafBulkDownloadStore();
  const [diskPages, setDiskPages] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void countDownloadedPages().then(setDiskPages);
    }, []),
  );

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
      push("/(app)/quran");
    }
  }, [selectedAyah, resetSelection, closeTranslationSelector, push]);

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

  const isDownloadingAll = bulk.status === "running";
  const downloadProgress = {
    downloaded: isDownloadingAll ? bulk.downloaded : diskPages ?? 0,
    total: bulk.total,
  };

  return (
    <>
      <View
        style={{ paddingTop: insets.top + 8, zIndex: 100, position: "absolute" }}
        className="top-0 left-0 right-0 bg-surface shadow-sm border-b border-border dark:border-white/10"
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={handleBack} className="p-2 mr-2">
            <Ionicons
              name={selectedAyah ? "close" : "chevron-back"}
              size={24}
              color={iconColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleUI}
            activeOpacity={0.8}
            className="flex-1 flex-col justify-center"
          >
            <Text className="text-lg text-text tracking-tight">{surahName}</Text>
            {isDownloadingAll ? (
              <View className="flex-row items-center mt-0.5 space-x-1.5">
                <ActivityIndicator size="small" color={iconColor} style={{ transform: [{ scale: 0.7 }] }} />
                <Text className="text-[10px] text-muted">
                  Offline download ({downloadProgress.downloaded}/{downloadProgress.total})
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-muted mt-0.5">{pageLabel} • Juz&apos; {pageData?.juz}</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center space-x-1">
            <TouchableOpacity
              onPress={() => {
                if (viewMode === "translation") closeTranslationSelector();
                setViewMode(viewMode === "mushaf" ? "translation" : "mushaf");
              }}
              className="p-2 bg-surface rounded-full"
            >
              <Ionicons
                name={viewMode === "mushaf" ? "language" : "book"}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>

            {viewMode === "translation" && (
              <TouchableOpacity
                onPress={toggleTranslationSelector}
                className="p-2 rounded-full bg-surface"
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={iconColor}
                  style={{
                    transform: [{ rotate: translationSelectorOpen ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity className="p-2" onPress={handleToggleBookmark}>
              <Ionicons
                name={isBookmarkedActive ? "bookmark" : "bookmark-outline"}
                size={22}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isDownloadingAll && (
          <View className="w-full h-1 bg-surface">
            <View
              style={{
                width: `${Math.min(100, (downloadProgress.downloaded / downloadProgress.total) * 100)}%`,
              }}
              className="h-full bg-teal-600"
            />
          </View>
        )}
      </View>

      {viewMode === "translation" && <TranslationSelectorPanel />}
    </>
  );
}
