import React, { useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useReaderStore } from "../hooks/useReaderStore";
import { useTranslationPage } from "../hooks/useTranslationPage";
import { VerseTranslationEntry } from "../services/translationPageService";
import { Ionicons } from "@expo/vector-icons";
import { useCatalogStore } from "../store/catalogStore";
import { getTranslationsCached } from "../services";

interface TranslationPageProps {
  pageNumber: number;
  chapterIds: number[];
}

// ─── Verse Row ────────────────────────────────────────────────────────────────

const VerseRow = React.memo(function VerseRow({
  item,
  translationNames,
}: {
  item: VerseTranslationEntry;
  translationNames: Map<number, string>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 28,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Verse Key Badge */}
      <View style={{ flexDirection: "row", justifyContent: "flex-start", marginBottom: 18 }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: "#f1f5f9",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b", letterSpacing: 0.5 }}>
            {item.verseKey}
          </Text>
        </View>
      </View>

      {/* Arabic Text */}
      <Text
        style={{
          fontFamily: "Uthman",
          fontSize: 24,
          lineHeight: 52,
          textAlign: "right",
          color: "#0f172a",
          marginBottom: 32,
          writingDirection: "rtl",
        }}
      >
        {item.arabicText}
      </Text>

      {/* Translations */}
      {item.translations.map((t, idx) => {
        const name = translationNames.get(t.id) ?? "Translation";
        return (
          <View key={t.id} style={{ marginTop: idx === 0 ? 0 : 24 }}>
            {/* Translator Name */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#0d9488",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              {name}
            </Text>

            {/* Divider line under label */}
            <View style={{ height: 1, backgroundColor: "#f0fdf4", marginBottom: 10 }} />

            {/* Translation Text */}
            <Text
              style={{
                fontSize: 15,
                lineHeight: 26,
                color: "#334155",
                letterSpacing: 0.1,
              }}
            >
              {t.text || "Translation not available."}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

// ─── Surah Divider ────────────────────────────────────────────────────────────

function SurahDivider({ name }: { name: string }) {
  return (
    <View
      style={{
        backgroundColor: "#e8e0d5",   // warm sand tone matching screenshot
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#d4c9bb",
        paddingVertical: 18,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      {/* Decorative top line */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "#b5a99a" }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#b5a99a", marginHorizontal: 8 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: "#b5a99a" }} />
      </View>

      <Text
        style={{
          fontSize: 20,
          color: "#2d1f0e",
          fontFamily: "Uthman",
          marginBottom: 2,
          textAlign: "center",
        }}
      >
        {name}
      </Text>

      {/* Decorative bottom line */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "#b5a99a" }} />
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#b5a99a", marginHorizontal: 8 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: "#b5a99a" }} />
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const TranslationPage = React.memo(function TranslationPage({
  pageNumber,
  chapterIds,
}: TranslationPageProps) {
  const { selectedTranslations, toggleUI } = useReaderStore();
  const { surahs } = useCatalogStore();
  const { verses, loading, error, retry } = useTranslationPage(pageNumber, selectedTranslations);

  const surahNameMap = useMemo(() => {
    const map = new Map<number, string>();
    (surahs ?? []).forEach((s) =>
      map.set(s.number, s.englishName ?? s.name ?? `Surah ${s.number}`)
    );
    return map;
  }, [surahs]);

  const [availableTranslations, setAvailableTranslations] = React.useState<Map<number, string>>(new Map());
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
      return <VerseRow item={item.entry} translationNames={availableTranslations} />;
    },
    [surahNameMap, availableTranslations],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
        <Text
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          {error.includes("network") || error.includes("fetch")
            ? "No internet connection. Download this translation for offline use."
            : "Could not load translation. Try again."}
        </Text>
        <TouchableOpacity
          onPress={retry}
          className="bg-teal-600 px-6 py-2.5 rounded-full flex-row items-center"
        >
          <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white ">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Pressable onPress={toggleUI} style={{ flex: 1 }}>
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
        />
      </Pressable>
    </View>
  );
});