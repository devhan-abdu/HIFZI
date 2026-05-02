import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useReaderStore } from "../../hook/useReaderStore";
import { getAyahTranslationCached } from "../../services";

export const TranslationContent = () => {
  const { selectedAyah, selectedTranslation } = useReaderStore();
  const ayahLabel =
    selectedAyah ? `${selectedAyah.sura}:${selectedAyah.ayah}` : "None";

  const [translationText, setTranslationText] = useState<string>("");
  const [resourceName, setResourceName] = useState<string>("Translation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizedText = useMemo(
    () => translationText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    [translationText],
  );

  useEffect(() => {
    let mounted = true;

    const loadTranslation = async () => {
      if (!selectedAyah) {
        setTranslationText("");
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getAyahTranslationCached(
          selectedTranslation,
          selectedAyah.sura,
          selectedAyah.ayah,
        );

        if (!mounted) {
          return;
        }

        setTranslationText(data.text);
        setResourceName(data.resourceName ?? "Translation");
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        const message =
          loadError instanceof Error ?
            loadError.message
          : "Failed to load translation.";
        setError(
          message.includes("TRANSLATION_NOT_FOUND") ?
            "No translation available for this ayah with the selected translation source."
          : "Failed to load translation.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTranslation();
    return () => {
      mounted = false;
    };
  }, [selectedAyah, selectedTranslation]);

  return (
    <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
      <Text className="text-sm  mb-2 text-teal-700">
        {resourceName.toUpperCase()}
      </Text>
      <Text className="text-xs text-gray-400 mb-4">Ayah {ayahLabel}</Text>

      {loading ?
        <ActivityIndicator color="#276359" />
      : error ?
        <Text className="text-sm text-rose-500">{error}</Text>
      : <Text className="text-lg leading-7 text-gray-800">
          {sanitizedText || "No translation text available for this ayah."}
        </Text>
      }

      <View className="h-20" />
    </BottomSheetScrollView>
  );
};
