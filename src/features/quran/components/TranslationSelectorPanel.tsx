import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { useReaderStore } from "../hooks/useReaderStore";
import {
  getTranslationsWithDownloadStatus,
  downloadTranslation,
  isDownloading,
  DownloadedTranslation,
} from "../services/translationPageService";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function TranslationSelectorPanel() {
  const insets = useSafeAreaInsets();
  const {
    selectedTranslations,
    toggleTranslation,
    translationSelectorOpen,
    closeTranslationSelector,
  } = useReaderStore();

  const [translations, setTranslations] = useState<DownloadedTranslation[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const slideAnim = useRef(new Animated.Value(-400)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: translationSelectorOpen ? 0 : -400,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [translationSelectorOpen, slideAnim]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getTranslationsWithDownloadStatus();
      setTranslations(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (translationSelectorOpen) void loadList();
  }, [translationSelectorOpen, loadList]);

  const handleDownload = async (t: DownloadedTranslation) => {
    if (isDownloading(t.id)) return;
    setDownloadProgress((p) => ({ ...p, [t.id]: 0 }));
    try {
      await downloadTranslation(t.id, t.name, (progress) => {
        setDownloadProgress((p) => ({ ...p, [t.id]: progress }));
      });
      await loadList();
    } finally {
      setDownloadProgress((p) => {
        const next = { ...p };
        delete next[t.id];
        return next;
      });
    }
  };

  const downloaded = translations.filter((t) => t.downloaded);
  const available = translations.filter((t) => !t.downloaded);

  if (!translationSelectorOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={{ position: "absolute", inset: 0, zIndex: 200 }}
        onPress={closeTranslationSelector}
      />

      {/* Panel */}
      <Animated.View
        style={{
          position: "absolute",
          top: insets.top + 56,
          left: 0,
          right: 0,
          zIndex: 201,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={{
            marginHorizontal: 12,
            borderRadius: 20,
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 16,
            maxHeight: 480,
            overflow: "hidden",
          }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-8 h-1 rounded-full bg-slate-200" />
          </View>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#0d9488" />
            </View>
          ) : (
            <FlatList
              data={[
                ...(downloaded.length > 0 ? [{ type: "header", label: "Downloaded" } as any] : []),
                ...downloaded.map((t) => ({ type: "item", ...t })),
                ...(available.length > 0 ? [{ type: "header", label: "Available to Download" } as any] : []),
                ...available.map((t) => ({ type: "item", ...t })),
              ]}
              keyExtractor={(item, i) => item.type === "header" ? `h-${i}` : String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.type === "header") {
                  return (
                    <Text className="text-[10px] uppercase tracking-widest text-slate-400 mt-4 mb-2 px-1">
                      {item.label}
                    </Text>
                  );
                }

                const t = item as DownloadedTranslation;
                const isSelected = selectedTranslations.includes(t.id);
                const progress = downloadProgress[t.id];
                const inProgress = progress !== undefined;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      toggleTranslation(t.id);
                    }}
                    className={`flex-row items-center px-3 py-3 mb-1 rounded-2xl ${
                      isSelected ? "bg-teal-50" : "bg-slate-50/80"
                    }`}
                  >
                    {/* Checkbox Icon */}
                    <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                      isSelected ? "bg-teal-600 border-teal-600" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>

                    {/* Name */}
                    <View className="flex-1 mr-3">
                      <Text
                        className={`text-sm font-medium ${isSelected ? "text-teal-800" : "text-slate-700"}`}
                        numberOfLines={1}
                      >
                        {t.name}
                      </Text>
                      {t.language_name ? (
                        <Text className="text-[10px] text-slate-400 mt-0.5">{t.language_name}</Text>
                      ) : null}
                    </View>

                    {/* Right side: Status/Download */}
                    {t.downloaded ? (
                      <Ionicons name="cloud-done-outline" size={16} color="#94a3b8" />
                    ) : inProgress ? (
                      <ActivityIndicator size="small" color="#0d9488" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDownload(t)}
                        className="bg-slate-100 px-2.5 py-1 rounded-full"
                      >
                        <Text className="text-[9px] text-slate-600 font-bold">GET</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <TouchableOpacity 
                  onPress={closeTranslationSelector}
                  className="mt-2 py-3 items-center border-t border-slate-100"
                >
                  <Text className="text-teal-600 font-semibold text-sm">More Translations</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      </Animated.View>
    </>
  );
}
