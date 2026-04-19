import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  SectionList,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetSurahByJuz } from "@/src/hooks/useGetSurahByJuz";
import { JuzHeader } from "@/src/features/quran/components/JuzHeader";
import { SurahRow } from "@/src/features/quran/components/SurahRow";
import { Surah } from "@/src/features/quran/type";
import { useBookmarks } from "@/src/features/quran/hook/useBookmarks";
import { useCatalogStore } from "@/src/features/quran/store/catalogStore";

export default function SurahIndex() {
  const router = useRouter();
  const { displayData, loading, error } = useGetSurahByJuz();
  const { bookmarks } = useBookmarks();
  const surahs = useCatalogStore((store) => store.surahs);
  const [activeTab, setActiveTab] = useState<"surahs" | "bookmarks">("surahs");

  const handlePress = (item: Surah) => {
    router.push(`/quran/reader?page=${item.startingPage}`);
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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#276359" />
        <Text className="mt-4 text-slate-400 ">Loading Quran...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-white">
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text className="text-lg   text-slate-900 mt-2">Oops!</Text>
        <Text className="text-slate-500 text-center mt-1">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white ">
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row rounded-2xl bg-slate-100 p-1">
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
                  isActive ? "bg-white" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    isActive ? "text-teal-800" : "text-slate-500"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeTab === "surahs" ? (
        <SectionList
          sections={displayData}
          keyExtractor={(item) => `${item.number}-${item.startingPage}`}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={15}
          removeClippedSubviews={false}
          renderSectionHeader={({ section }) => (
            <JuzHeader
              juzNumber={section.juzNumber}
              juzStartingPage={section.juzStartingPage}
            />
          )}
          renderItem={({ item }) => (
            <View className="flex-col my-3 px-2">
              <SurahRow surah={item} onPress={handlePress} />
            </View>
          )}
        />
      ) : bookmarkRows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="bookmark-outline" size={44} color="#94a3b8" />
          <Text className="mt-4 text-lg font-semibold text-slate-800">
            No bookmarks yet
          </Text>
          <Text className="mt-2 text-center text-slate-500">
            Long press an ayah in the reader, then bookmark it to find it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarkRows}
          keyExtractor={(item) => item.localId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/quran/reader",
                  params: {
                    page: String(item.pageNumber),
                    ayah: item.verseKey,
                  },
                })
              }
              className="mb-3 rounded-3xl border border-slate-200 bg-white px-4 py-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold text-slate-900">
                    {item.surahName}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    Ayah {item.verseKey} · Page {item.pageNumber || "-"}
                  </Text>
                  {/* {item.syncStatus !== "synced" && (
                    <Text className="mt-2 text-xs font-medium text-amber-700">
                      {item.syncStatus === "failed" ? "Sync failed" : "Sync pending"}
                    </Text>
                  )}
                  {item.syncError && (
                    <Text className="mt-1 text-xs text-rose-500">
                      {item.syncError}
                    </Text>
                  )} */}
                </View>

                <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                  <Ionicons name="arrow-forward" size={18} color="#0f766e" />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
