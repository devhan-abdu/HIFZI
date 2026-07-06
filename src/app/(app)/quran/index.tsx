import React, { useMemo, useState, useCallback } from "react";
import { View, SectionList, FlatList, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useFocusEffect } from "expo-router";
import { useNavigate } from "@/src/hooks/useNavigate";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useGetSurahByJuz } from "@/src/hooks/useGetSurahByJuz";
import { JuzHeader } from "@/src/features/quran/components/JuzHeader";
import { SurahRow } from "@/src/features/quran/components/SurahRow";
import { Surah } from "@/src/features/quran/type";
import { useBookmarks } from "@/src/features/quran/hooks/useBookmarks";
import { getLastReadPage } from "@/src/features/quran/services/quranLastReadStorage";
import { useCatalogStore } from "@/src/features/quran/store/catalogStore";

export default function SurahIndex() {
  const { push } = useNavigate();
  const { displayData, loading, error } = useGetSurahByJuz();
  const { bookmarks } = useBookmarks();
  const surahs = useCatalogStore((store) => store.surahs);
  const [activeTab, setActiveTab] = useState<"surahs" | "bookmarks">("surahs");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [resumePage, setResumePage] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getLastReadPage().then(setResumePage);
    }, []),
  );

  const handlePress = (item: Surah) => {
    push(`/quran/reader?page=${item.startingPage}`);
  };

  const bookmarkRows = useMemo(() => {
    return bookmarks.map((bookmark) => {
      const suraNumber = Number(bookmark.verseKey.split(":")[0] ?? 0);
      const surah = surahs.find((item) => item.number === suraNumber);

      return {
        ...bookmark,
        surahName: surah?.englishName ?? `Surah ${suraNumber}`,
      };
    });
  }, [bookmarks, surahs]);

  if (loading) {
    return (
      <View className="flex-1 bg-background px-4 pt-3">
        <View className="flex-row rounded-2xl bg-background p-1 mb-4">
          <View className="flex-1 rounded-2xl bg-background h-12 mx-0.5" />
          <View className="flex-1 h-12 mx-0.5" />
        </View>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} className="mb-4 px-2">
            <View className="h-3 w-16 bg-background rounded-md mb-3 opacity-60" />
            <View className="h-14 bg-background rounded-2xl" />
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-background">
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text className="text-lg   text-text mt-2">Oops!</Text>
        <Text className="text-muted text-center mt-1">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row gap-2 mb-3">
          {resumePage != null && (
            <Pressable
              onPress={() => push(`/quran/reader?page=${resumePage}`)}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-background border border-border py-3 px-3"
            >
              <Ionicons
                name="book-outline"
                size={18}
                color={isDark ? "#94a3b8" : "#475569"}
              />
              <Text className="ml-2 text-sm text-text">
                Continue · Page {resumePage}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => push("/(app)/quran/offline")}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-background border border-border py-3 px-3"
          >
            <Ionicons
              name="cloud-download-outline"
              size={18}
              color={isDark ? "#94a3b8" : "#475569"}
            />
            <Text className="ml-2 text-sm text-muted">Offline</Text>
          </Pressable>
        </View>

        <View className="flex-row rounded-2xl bg-background p-1">
          {[
            { key: "surahs" as const, label: "Surahs" },
            { key: "bookmarks" as const, label: "Bookmarks" },
          ].map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-2xl px-4 py-3 ${
                  isActive ? "bg-primary/10" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center text-sm  ${
                    isActive ? "text-text" : "text-muted"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeTab === "surahs" ?
        <SectionList
          sections={displayData}
          keyExtractor={(item) => `${item.number}-${item.startingPage}`}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={15}
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderSectionHeader={({ section }) => (
            <JuzHeader
              juzNumber={section.juzNumber}
              juzStartingPage={section.juzStartingPage}
            />
          )}
          renderItem={({ item }) => (
            <View className="flex-col">
              <SurahRow surah={item} onPress={handlePress} />
            </View>
          )}
        />
      : bookmarkRows.length === 0 ?
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="bookmark-outline" size={44} color="#94a3b8" />
          <Text className="mt-4 text-lg  text-text">No bookmarks yet</Text>
          <Text className="mt-2 text-center text-muted">
            Long press an ayah in the reader, then bookmark it to find it here.
          </Text>
        </View>
      : <FlatList
          data={bookmarkRows}
          keyExtractor={(item) => item.localId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                push({
                  pathname: "/quran/reader",
                  params: {
                    page: String(item.pageNumber),
                    ayah: item.verseKey,
                  },
                })
              }
              className="mb-3 rounded-3xl border border-border bg-background px-4 py-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base  text-text">{item.surahName}</Text>
                  <Text className="mt-1 text-sm text-muted">
                    Ayah {item.verseKey} · Page {item.pageNumber || "-"}
                  </Text>
                </View>

                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={isDark ? "#4ade80" : "#276359"}
                  />
                </View>
              </View>
            </Pressable>
          )}
        />
      }
    </View>
  );
}
