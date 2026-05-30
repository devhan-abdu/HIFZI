import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        style={styles.scroll}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 32 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Ionicons name="cloud-download-outline" size={40} color="#0d9488" />
          <Text style={styles.heroTitle}>Mushaf pages</Text>
          <Text style={styles.heroBody}>
            Pages load automatically as you read and nearby pages are cached in the background (~50 MB
            for all 604). Use this screen only if you want the full mushaf on device for offline use.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Saved on this device</Text>
          {localCount === null ? (
            <ActivityIndicator color="#0d9488" style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.cardStat}>
              {downloaded} / {total} pages
            </Text>
          )}

          {isRunning && (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>
              {progress?.currentPages && progress.currentPages.length > 0 && (
                <Text style={styles.batch}>
                  Fetching pages {progress.currentPages.join(", ")}
                </Text>
              )}
            </>
          )}

          <View style={styles.row}>
            {isRunning ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel}>
                <Text style={styles.secondaryText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void runDownload()}
                disabled={localCount !== null && localCount >= 604}
              >
                <Text style={styles.primaryText}>
                  {localCount !== null && localCount >= 604 ? "All pages saved" : "Download all pages"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>
            You can leave this screen and keep reading — progress appears in the reader header while the
            download runs.
          </Text>
        </View>

        <TouchableOpacity style={styles.linkBack} onPress={() => router.back()}>
          <Ionicons name="book-outline" size={18} color="#0d9488" />
          <Text style={styles.linkBackText}>Back to Quran</Text>
        </TouchableOpacity>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  hero: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 360,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardStat: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 6,
    marginBottom: 4,
  },
  track: {
    height: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  fill: {
    height: "100%",
    backgroundColor: "#0d9488",
    borderRadius: 999,
  },
  pctText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0d9488",
    marginTop: 8,
    textAlign: "center",
  },
  batch: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
  },
  row: { marginTop: 16 },
  primaryBtn: {
    backgroundColor: "#0d9488",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#475569", fontWeight: "600", fontSize: 16 },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: "#94a3b8",
    marginTop: 14,
    textAlign: "center",
  },
  linkBack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  linkBackText: { fontSize: 15, fontWeight: "600", color: "#0d9488" },
});
