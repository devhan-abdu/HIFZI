import React, { useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useReaderStore } from "../hooks/useReaderStore";
import { useTranslationPage } from "../hooks/useTranslationPage";
import { VerseTranslationEntry } from "../services/translationPageService";
import { Ionicons } from "@expo/vector-icons";
import { useCatalogStore } from "../store/catalogStore";
import { getTranslationsCached } from "../services";
import { TranslationPageSkeleton } from "./QuranPageSkeletons";

interface TranslationPageProps {
  pageNumber: number;
  chapterIds: number[];
}

const VerseRow = React.memo(function VerseRow({
  item,
  translationNames,
}: {
  item: VerseTranslationEntry;
  translationNames: Map<number, string>;
}) {
  return (
    <View className="px-5 pt-5 pb-7 border-b border-border bg-background">
      <View className="flex-row justify-start mb-4">
        <View className="px-3 py-1.5 rounded-xl bg-background/80 dark:bg-background/90">
          <Text className="text-[12px] font-semibold text-muted tracking-[0.5px]">
            {item.verseKey}
          </Text>
        </View>
      </View>

      <Text
        className="text-[24px] leading-[52px] text-right text-text mb-8"
        style={{
          fontFamily: "Uthman",
          writingDirection: "rtl" as const,
          textAlign: "right" as const,
        }}
      >
        {item.arabicText}
      </Text>

      {item.translations.map((t, idx) => {
        const name = translationNames.get(t.id) ?? "Translation";
        return (
          <View key={t.id} className={idx === 0 ? "mt-0" : "mt-6"}>
            <Text className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 text-muted">
              {name}
            </Text>

            <View className="h-px bg-border mb-2" />

            <Text className="text-[15px] leading-7 text-text tracking-[0.1px]">
              {t.text || "Translation not available."}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

function SurahDivider({ name }: { name: string }) {
  return (
    <View className="bg-background border-y border-border py-4 px-5 items-center">
      <View className="flex-row items-center mb-2 w-full">
        <View className="flex-1 h-px bg-border" />
        <View className="w-1.5 h-1.5 rounded-full bg-border mx-2" />
        <View className="flex-1 h-px bg-border" />
      </View>

      <Text
        className="text-[20px] text-text text-center mb-0"
        style={{ fontFamily: "Uthman" }}
      >
        {name}
      </Text>

      <View className="flex-row items-center mt-2 w-full">
        <View className="flex-1 h-px bg-border" />
        <View className="w-1.5 h-1.5 rounded-full bg-border mx-2" />
        <View className="flex-1 h-px bg-border" />
      </View>
    </View>
  );
}

export const TranslationPage = React.memo(function TranslationPage({
  pageNumber,
  chapterIds,
}: TranslationPageProps) {
  const { selectedTranslations, toggleUI } = useReaderStore();
  const { surahs } = useCatalogStore();
  const { verses, loading, error, retry } = useTranslationPage(
    pageNumber,
    selectedTranslations,
  );

  const surahNameMap = useMemo(() => {
    const map = new Map<number, string>();
    (surahs ?? []).forEach((s) =>
      map.set(s.number, s.englishName ?? s.name ?? `Surah ${s.number}`),
    );
    return map;
  }, [surahs]);

  const [availableTranslations, setAvailableTranslations] = React.useState<
    Map<number, string>
  >(new Map());
  React.useEffect(() => {
    getTranslationsCached().then((list) => {
      setAvailableTranslations(new Map(list.map((t) => [t.id, t.name])));
    });
  }, []);

  type ListItem =
    | { type: "divider"; surahId: number; key: string }
    | { type: "verse"; entry: VerseTranslationEntry; key: string };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastSura = -1;

    for (const v of verses) {
      const sura = Number(v.verseKey.split(":")[0]);
      if (sura !== lastSura) {
        items.push({ type: "divider", surahId: sura, key: `divider-${sura}` });
        lastSura = sura;
      }
      items.push({ type: "verse", entry: v, key: v.verseKey });
    }
    return items;
  }, [verses]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "divider") {
        const name = surahNameMap.get(item.surahId) ?? `Surah ${item.surahId}`;
        return <SurahDivider name={name} />;
      }
      return (
        <VerseRow item={item.entry} translationNames={availableTranslations} />
      );
    },
    [surahNameMap, availableTranslations],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#9ba3a0" : "#6b7280";

  if (loading && verses.length === 0) {
    return <TranslationPageSkeleton />;
  }

  if (error) {
    return (
      <Pressable onPress={toggleUI} className="flex-1 bg-background justify-center items-center p-8">
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={iconColor}
          style={{ marginBottom: 12 }}
        />
        <Text className="text-sm leading-6 text-muted text-center mb-6">
          {error.includes("network") || error.includes("fetch") ?
            "No internet connection. Download this translation for offline use."
          : "Could not load translation. Try again."}
        </Text>
        <TouchableOpacity
          onPress={retry}
          className="bg-primary px-6 py-2.5 rounded-full flex-row items-center active:opacity-90"
        >
          <Ionicons
            name="refresh"
            size={16}
            color="#ffffff"
            style={{ marginRight: 8 }}
          />
          <Text className="text-primary-foreground font-semibold">Retry</Text>
        </TouchableOpacity>
      </Pressable>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        onScrollBeginDrag={() => useReaderStore.getState().hideUI()}
      />
    </View>
  );
});
