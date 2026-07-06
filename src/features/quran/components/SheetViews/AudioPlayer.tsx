import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { Text } from "@/src/components/common/ui/Text";
import { useQuranAudio } from "../../hooks/useQuranAudio";
import { useReaderStore } from "../../hooks/useReaderStore";
import { getRecitationsCached, Reciter } from "../../services";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

interface AudioPlayerProps {
  chapterId: number;
  onExpand?: () => void;
}

export const AudioPlayer = ({ chapterId, onExpand }: AudioPlayerProps) => {
  const { playerState, selectedAudio, setAudio, playingAyah } = useReaderStore();
  const { togglePlayback, downloadProgress, isDownloading, error } = useQuranAudio(chapterId);
  const { colorScheme } = useColorScheme();

  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loadingReciters, setLoadingReciters] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRecitationsCached()
      .then((data) => { if (mounted) setReciters(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingReciters(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (reciters.length > 0 && !reciters.some((r) => r.id === selectedAudio)) {
      setAudio(reciters[0]!.id);
    }
  }, [reciters, selectedAudio, setAudio]);

  const activeReciter = reciters.find((r) => r.id === selectedAudio) ?? reciters[0];

  const isPlaying = playerState === "playing";
  const isBuffering = playerState === "buffering" || isDownloading;

  const handleToggle = useCallback(() => {
    void togglePlayback();
  }, [togglePlayback]);

  const handleSelectQari = useCallback((id: number) => {
    setAudio(id);
  }, [setAudio]);

  const iconColor = colorScheme === "dark" ? "#e2e8f0" : "#334155";
  const mutedColor = colorScheme === "dark" ? "#64748b" : "#94a3b8";

  return (
    <View className="flex-1">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity
          className="flex-1 mr-3"
          onPress={() => onExpand?.()}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className="flex-1">
              {isDownloading ? (
                <>
                  <Text className="text-xs text-muted mb-0.5">Downloading…</Text>
                  <View className="h-1 rounded-full bg-border overflow-hidden">
                    <View
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(downloadProgress * 100, 2)}%` }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-sm font-medium text-text" numberOfLines={1}>
                    {activeReciter?.name ?? "Select Reciter"}
                  </Text>
                  {playingAyah && isPlaying && (
                    <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                      {playingAyah}
                    </Text>
                  )}
                </>
              )}
            </View>
            <Ionicons name="chevron-up" size={16} color={mutedColor} style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggle}
          disabled={isBuffering}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          style={{ borderWidth: 1, borderColor: colorScheme === "dark" ? "#1e293b" : "#e2e8f0" }}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={iconColor} />
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center px-5 pt-4 pb-2">
        <Text className="text-base font-semibold text-text">Select a Qari</Text>
      </View>

      {loadingReciters ? (
        <View className="py-12 items-center">
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      ) : (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {reciters.map((reciter) => {
            const isSelected = selectedAudio === reciter.id;
            return (
              <TouchableOpacity
                key={reciter.id}
                onPress={() => handleSelectQari(reciter.id)}
                className="flex-row items-center px-5 py-3.5"
                activeOpacity={0.6}
              >
                <Text
                  className={`flex-1 text-sm ${isSelected ? "text-primary font-medium" : "text-muted"}`}
                  numberOfLines={1}
                >
                  {reciter.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={iconColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>
      )}
    </View>
  );
};
