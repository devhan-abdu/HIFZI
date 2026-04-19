import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useReaderStore } from "../../hook/useReaderStore";
import { getAyahTafsirCached } from "../../services";

export const TafsirContent = () => {
  const { selectedAyah, selectedTafsir } = useReaderStore();
  const ayahLabel =
    selectedAyah ? `${selectedAyah.sura}:${selectedAyah.ayah}` : "None";
  const [tafsirText, setTafsirText] = useState<string>("");
  const [resourceName, setResourceName] = useState<string>("Tafsir");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizedText = useMemo(
    () => tafsirText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    [tafsirText],
  );

  useEffect(() => {
    let mounted = true;

    const loadTafsir = async () => {
      if (!selectedAyah) {
        setTafsirText("");
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getAyahTafsirCached(
          selectedTafsir,
          selectedAyah.sura,
          selectedAyah.ayah,
        );

        if (!mounted) {
          return;
        }

        setTafsirText(data.text);
        setResourceName(data.resourceName ?? "Tafsir");
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load tafsir.";
        setError(
          message.includes("TAFSIR_NOT_FOUND") ?
            "No tafsir available for this ayah with the selected tafsir source."
          : "Failed to load tafsir.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadTafsir();
    return () => {
      mounted = false;
    };
  }, [selectedAyah, selectedTafsir]);

  return (
    <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
      <Text className="text-sm text-teal-600 font-bold mb-2">
        {resourceName.toUpperCase()}
      </Text>
      <Text className="text-xs text-gray-400 mb-4">Ayah {ayahLabel}</Text>

      {loading ?
        <ActivityIndicator color="#276359" />
      : error ?
        <Text className="text-sm text-rose-500">{error}</Text>
      : <Text className="text-lg leading-7 text-gray-800">
          {sanitizedText || "No tafsir text available for this ayah."}
        </Text>
      }
      <View className="h-20" />
    </BottomSheetScrollView>
  );
};
