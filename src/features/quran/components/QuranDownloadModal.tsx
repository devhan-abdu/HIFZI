import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DownloadProgress } from "../services/quranImageService";

interface QuranDownloadModalProps {
  visible: boolean;
  progress: DownloadProgress | null;
  onStart: () => void;
  onCancel: () => void;
  onDismiss: () => void;
  promptMode?: boolean;
}

function formatPercent(percent: number): string {
  return `${Math.round(percent * 100)}%`;
}

export function QuranDownloadModal({
  visible,
  progress,
  onStart,
  onCancel,
  onDismiss,
  promptMode = false,
}: QuranDownloadModalProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible || promptMode) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, promptMode, pulse]);

  const isRunning = progress?.status === "running";
  const isComplete = progress?.status === "completed";
  const isCancelled = progress?.status === "cancelled";
  const showPrompt = promptMode && !isRunning && !isComplete;

  const percent = progress?.percent ?? 0;
  const downloaded = progress?.downloaded ?? 0;
  const total = progress?.total ?? 604;
  const remaining = progress?.remaining ?? total;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isComplete ? "checkmark-circle" : "cloud-download-outline"}
              size={36}
              color={isComplete ? "#16a34a" : "#0d9488"}
            />
          </View>

          {showPrompt ? (
            <>
              <Text style={styles.title}>Download Quran Pages</Text>
              <Text style={styles.subtitle}>
                Save all 604 mushaf pages (~50 MB) for instant offline reading without
                interruptions.
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
                  <Text style={styles.secondaryText}>Not Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={onStart}>
                  <Text style={styles.primaryText}>Download All</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>
                {isComplete
                  ? "Download Complete"
                  : isCancelled
                    ? "Download Paused"
                    : "Downloading Mushaf Pages"}
              </Text>

              <Text style={styles.percent}>{formatPercent(percent)}</Text>

              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(100, percent * 100)}%` }]} />
                {!isComplete && (
                  <Animated.View
                    style={[styles.shimmer, { opacity: pulse }]}
                  />
                )}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{downloaded}</Text>
                  <Text style={styles.statLabel}>Downloaded</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{remaining}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>

              {isRunning && progress?.currentPages && progress.currentPages.length > 0 && (
                <Text style={styles.currentBatch}>
                  Fetching pages {progress.currentPages.join(", ")}
                </Text>
              )}

              {isComplete ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={onDismiss}>
                  <Text style={styles.primaryText}>Continue Reading</Text>
                </TouchableOpacity>
              ) : isRunning ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
                  <Text style={styles.secondaryText}>Run in Background</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={onDismiss}>
                  <Text style={styles.primaryText}>Close</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    alignSelf: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  percent: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0d9488",
    textAlign: "center",
    marginBottom: 12,
  },
  track: {
    height: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 16,
  },
  fill: {
    height: "100%",
    backgroundColor: "#0d9488",
    borderRadius: 999,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentBatch: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#0d9488",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 15,
  },
});
