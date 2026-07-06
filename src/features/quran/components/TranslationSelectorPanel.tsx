import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  Animated,
  Platform,
  ToastAndroid,
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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 16,
            maxHeight: 480,
            overflow: "hidden",
          }}
          className="bg-background"
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-8 h-1 rounded-full bg-border" />
          </View>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator className="text-primary" />
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
                    <Text className="text-[10px] uppercase tracking-widest text-muted mt-4 mb-2 px-1">
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
                      if (!t.downloaded && !inProgress && !isDownloading(t.id)) {
                        void handleDownload(t);
                        if (Platform.OS === "android") {
                          ToastAndroid.show(`Downloading ${t.name} for offline use...`, ToastAndroid.SHORT);
                        }
                      }
                    }}
                    className={`flex-row items-center px-3 py-3 mb-1 rounded-2xl ${
                      isSelected ? "bg-primary/10" : "bg-surface"
                    }`}
                  >
                    <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                      isSelected ? "bg-primary border-primary" : "border-border bg-background"
                    }`}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>

                    <View className="flex-1 mr-3">
                      <Text
                        className={`text-sm ${isSelected ? "text-primary" : "text-muted"}`}
                        numberOfLines={1}
                      >
                        {t.name}
                      </Text>
                      <View className="flex-row items-center space-x-1.5 mt-0.5">
                        {t.language_name ? (
                          <Text className="text-[10px] text-muted">{t.language_name}</Text>
                        ) : null}
                        {t.downloaded && (
                          <Text className="text-[10px] text-primary">• Downloaded</Text>
                        )}
                      </View>
                      
                      {inProgress && (
                        <View className="w-full h-1 bg-surface rounded-full mt-2 overflow-hidden">
                          <View 
                            style={{ width: `${progress * 100}%` }} 
                            className="h-full bg-primary" 
                          />
                        </View>
                      )}
                    </View>

                    {t.downloaded ? (
                      <Ionicons name="checkmark-circle" size={18} className="text-primary" />
                    ) : inProgress ? (
                      <View className="flex-row items-center space-x-1">
                        <ActivityIndicator size="small" className="text-primary" />
                        <Text className="text-[10px] text-primary ">{Math.round(progress * 100)}%</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center bg-surface/80 px-2 py-1 rounded-full space-x-1">
                        <Ionicons name="cloud-download-outline" size={12} color="#64748b" />
                        <Text className="text-[9px] text-muted ">Tap to use</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <TouchableOpacity 
                  onPress={closeTranslationSelector}
                  className="mt-2 py-3 items-center border-t border-border"
                >
                  <Text className="text-primary text-sm">More Translations</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      </Animated.View>
    </>
  );
}
