import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useReaderStore } from "../hooks/useReaderStore";
import {
  getPageVersesWithTranslation,
  getTranslationsCached,
  PageVerse,
  Translation,
} from "../services";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/ui/Button";

interface TranslationPageProps {
  pageNumber: number;
}

export const TranslationPage = ({ pageNumber }: TranslationPageProps) => {
  const {
    selectedTranslation,
    setTranslation,
    playingAyah,
    setPlayingAyah,
    setMode,
    setSelectedAyah,
  } = useReaderStore();

  const [verses, setVerses] = useState<PageVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [availableTranslations, setAvailableTranslations] = useState<
    Translation[]
  >([]);

  // 1. Fetch Verses for the specific page
  useEffect(() => {
    let isMounted = true;
    const fetchPageContent = async () => {
      setLoading(true);
      setError(null);
      try {
        // We use the existing page-based content fetcher but ensure
        // it includes the selected translation ID
        const data = await getPageVersesWithTranslation(
          pageNumber,
          selectedTranslation,
        );
        if (isMounted) setVerses(data);
      } catch (err: any) {
        if (isMounted) setError(err?.message || "Failed to load translations");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchPageContent();
    return () => {
      isMounted = false;
    };
  }, [pageNumber, selectedTranslation]);

  // 2. Fetch Translation List (for the picker)
  useEffect(() => {
    let isMounted = true;
    const fetchList = async () => {
      try {
        const data = await getTranslationsCached();
        if (isMounted) setAvailableTranslations(data);
      } catch (err) {
        console.error(err);
      }
    };
    void fetchList();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeTranslationName = useMemo(() => {
    return (
      availableTranslations.find((t) => t.id === selectedTranslation)?.name ||
      "Translation"
    );
  }, [availableTranslations, selectedTranslation]);

  const handlePlayAyah = (sura: number, ayah: number, verseKey: string) => {
    setSelectedAyah({ sura, ayah });
    setPlayingAyah(verseKey);
    setMode("recitation");
  };

  const renderVerse = ({ item }: { item: PageVerse }) => {
    const isPlaying = playingAyah === item.verse_key;

    // Clean HTML tags from API (like <sup> or <br>)
    const translationText =
      item.translations?.[0]?.text
        ?.replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim() || "Translation not available for this ID.";

    const [suraStr, ayahStr] = item.verse_key.split(":");
    const sura = Number(suraStr);
    const ayah = Number(ayahStr);

    return (
      <View
        className={`px-5 py-6 border-b border-gray-100 ${isPlaying ? "bg-teal-50/60" : "bg-white"}`}
      >
        <View className="flex-row justify-between items-center mb-4">
          <View className="bg-slate-100 px-3 py-1 rounded-full">
            <Text className="text-[10px]  text-slate-500 uppercase">
              Verse {item.verse_key}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handlePlayAyah(sura, ayah, item.verse_key)}
          >
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={32}
              color="#0d9488"
            />
          </TouchableOpacity>
        </View>

        <Text
          className="text-right text-3xl leading-[55px] mb-5 text-slate-900"
          style={{
            fontFamily: "KFGQPC Uthman Taha Naskh",
            writingDirection: "rtl",
          }}
        >
          {item.text_uthmani}
        </Text>

        <Text className="text-lg text-slate-700 leading-8 font-normal">
          {translationText}
        </Text>
      </View>
    );
  };

  if (showPicker) {
    return (
      <View className="flex-1 bg-white pt-20 px-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl  text-slate-800">
            Translations
          </Text>
          <TouchableOpacity onPress={() => setShowPicker(false)}>
            <Ionicons name="close-circle" size={28} color="#64748b" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={availableTranslations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setTranslation(item.id);
                setShowPicker(false);
              }}
              className={`p-4 mb-2 rounded-2xl border ${selectedTranslation === item.id ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-transparent"}`}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text
                    className={`text-base ${selectedTranslation === item.id ? " text-teal-900" : "text-slate-700"}`}
                  >
                    {item.name}
                  </Text>
                  {/* <Text className="text-xs text-slate-500">
                    {item.language_name}
                  </Text> */}
                </View>
                {selectedTranslation === item.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#0d9488" />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Dynamic Header for Translation Page */}
      <View className="pt-16 pb-3 px-4 border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-slate-400 font-medium">Page {pageNumber}</Text>
        <TouchableOpacity
          className="flex-row items-center bg-teal-50 px-4 py-2 rounded-full border border-teal-100"
          onPress={() => setShowPicker(true)}
        >
          <Text
            className="text-xs  text-teal-800 mr-2"
            numberOfLines={1}
          >
            {activeTranslationName}
          </Text>
          <Ionicons name="options-outline" size={16} color="#0d9488" />
        </TouchableOpacity>
      </View>

      {loading ?
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      : error ?
        <View className="flex-1 items-center justify-center p-10">
          <Text className="text-center text-red-500 mb-4">{error}</Text>
          <Button onPress={() => setShowPicker(true)}>
            Change Translation
          </Button>
        </View>
      : <FlatList
          data={verses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVerse}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          // Optimization for long lists
          removeClippedSubviews={true}
          initialNumToRender={5}
        />
      }
    </View>
  );
};
