import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import {
  countDownloadedPages,
  downloadAllPages,
  type DownloadProgress,
} from "@/src/features/quran/services/quranImageService";
import { useMushafBulkDownloadStore } from "@/src/features/quran/store/mushafBulkDownloadStore";

export default function QuranOfflineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const abortRef = useRef<AbortController | null>(null);
  const setBulkProgress = useMushafBulkDownloadStore((s) => s.setBulkProgress);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [localCount, setLocalCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [starting, setStarting] = useState(false);

  const refreshCount = useCallback(async () => {
    const n = await countDownloadedPages();
    setLocalCount(n);
    if (n >= 604) {
      setBulkProgress({ status: "completed", downloaded: n, total: 604 });
    }
    return n;
  }, [setBulkProgress]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const runDownload = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStarting(true);
    setBulkProgress({ status: "running", downloaded: localCount ?? 0, total: 604 });

    try {
      await downloadAllPages((p) => {
        setProgress(p);
        setBulkProgress({
          status: p.status === "completed" ? "completed" : p.status === "cancelled" ? "cancelled" : "running",
          downloaded: p.downloaded,
          total: p.total,
        });
      }, controller.signal);
    } catch (e) {
      console.error(e);
      setBulkProgress({ status: "idle" });
    } finally {
      setStarting(false);
      void refreshCount();
      abortRef.current = null;
    }
  }, [localCount, refreshCount, setBulkProgress]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setBulkProgress({ status: "cancelled" });
  };

  const isRunning = progress?.status === "running" || starting;
  const downloaded = progress?.downloaded ?? localCount ?? 0;
  const total = progress?.total ?? 604;
  const pct = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 32 + insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center mb-5">
        <Ionicons name="cloud-download-outline" size={40} color="#276359" />
        <Text className="text-text text-xl mt-3">Mushaf pages</Text>
        <Text className="text-muted text-sm text-center mt-2 max-w-[360px] leading-relaxed">
          Pages load automatically as you read and nearby pages are cached in the background (~50 MB
          for all 604). Use this screen only if you want the full mushaf on device for offline use.
        </Text>
      </View>

      <View className="bg-surface rounded-[20px] p-5 border border-border">
        <Text className="text-muted text-xs uppercase tracking-widest">Saved on this device</Text>
        {localCount === null ? (
          <ActivityIndicator color="#276359" style={{ marginVertical: 12 }} />
        ) : (
          <Text className="text-text text-3xl mt-1.5 mb-1">
            {downloaded} / {total} pages
          </Text>
        )}

        {isRunning && (
          <>
            <View className="h-2.5 bg-border rounded-full overflow-hidden mt-3">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${pct}%` }}
              />
            </View>
            <Text className="text-primary text-sm mt-2 text-center">{pct}%</Text>
            {progress?.currentPages && progress.currentPages.length > 0 && (
              <Text className="text-muted text-xs text-center mt-1.5">
                Fetching pages {progress.currentPages.join(", ")}
              </Text>
            )}
          </>
        )}

        <View className="mt-4">
          {isRunning ? (
            <TouchableOpacity
              className="bg-border py-3.5 rounded-2xl items-center"
              onPress={handleCancel}
            >
              <Text className="text-text font-semibold text-base">Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`py-3.5 rounded-2xl items-center ${localCount !== null && localCount >= 604 ? "bg-border" : "bg-primary"}`}
              onPress={() => void runDownload()}
              disabled={localCount !== null && localCount >= 604}
            >
              <Text className={`font-semibold text-base ${localCount !== null && localCount >= 604 ? "text-muted" : "text-primary-foreground"}`}>
                {localCount !== null && localCount >= 604 ? "All pages saved" : "Download all pages"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-muted text-xs text-center leading-relaxed mt-3.5">
          You can leave this screen and keep reading — progress appears in the reader header while the
          download runs.
        </Text>
      </View>

      <TouchableOpacity
        className="flex-row items-center justify-center gap-2 mt-6"
        onPress={() => router.back()}
      >
        <Ionicons name="book-outline" size={18} color="#276359" />
        <Text className="text-primary text-base font-semibold">Back to Quran</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

