import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/src/components/common/ui/Text";
import { useQuranAudio } from "../../hook/useQuranAudio";
import { useReaderStore } from "../../hook/useReaderStore";
import { getRecitationsCached, Reciter } from "../../services";

interface QariListProps {
  chapterId: number;
  expanded: boolean;
}

export const QariList = ({ chapterId, expanded }: QariListProps) => {
  const { playerState, selectedAudio, selectedAyah, setAudio, playingAyah } =
    useReaderStore();

  const [recitations, setRecitations] = useState<Reciter[]>([]);
  const [isLoadingReciters, setIsLoadingReciters] = useState(true);

  const { togglePlayback, downloadProgress, isDownloading, error } =
    useQuranAudio(chapterId);

  useEffect(() => {
    let isMounted = true;
    const loadRecitations = async () => {
      try {
        const data = await getRecitationsCached();
        if (isMounted) setRecitations(data);
      } catch (err) {
        console.error("Failed to load reciters", err);
      } finally {
        if (isMounted) setIsLoadingReciters(false);
      }
    };
    void loadRecitations();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (recitations.length > 0 && !selectedAudio) {
      setAudio(recitations[0].id);
    }
  }, [recitations, selectedAudio, setAudio]);

  const activeReciter =
    recitations.find((r) => r.id === selectedAudio) ?? recitations[0];

  const getErrorMessage = (err: string) => {
    if (err.includes("network") || err.includes("fetch"))
      return "Connection lost. Please check internet.";
    if (err.includes("404")) return "Audio not available for this Surah.";
    return "Something went wrong. Try another reciter.";
  };

  return (
    <View className="px-2 pb-8">
      <View className="rounded-3xl bg-slate-900 p-5  shadow-xl">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
              {playerState === "playing" ? "Playing Now" : "Recitation"}
            </Text>
            <Text className="text-lg font-bold text-white" numberOfLines={1}>
              {activeReciter?.name || "Select Reciter"}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">
              Surah {chapterId} •{" "}
              {playingAyah ||
                (selectedAyah ?
                  `${selectedAyah.sura}:${selectedAyah.ayah}`
                : "Ready")}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => void togglePlayback()}
            disabled={playerState === "buffering"}
            className="h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg"
          >
            {playerState === "buffering" ?
              <ActivityIndicator size="small" color="#000" />
            : <Ionicons
                name={playerState === "playing" ? "pause" : "play"}
                size={30}
                color="#000"
              />
            }
          </TouchableOpacity>
        </View>

        {(isDownloading || playerState === "playing") && (
          <View className="mt-5">
            <View className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <View
                className="h-full rounded-full bg-teal-400"
                style={{ width: `${Math.max(downloadProgress, 0.05) * 100}%` }}
              />
            </View>
            {isDownloading && (
              <Text className="mt-2 text-right text-[10px] font-medium text-slate-400">
                Downloading: {Math.round(downloadProgress * 100)}%
              </Text>
            )}
          </View>
        )}

        {error && (
          <View className="mt-4 flex-row items-center rounded-xl bg-rose-500/10 p-3">
            <Ionicons name="alert-circle-outline" size={16} color="#fda4af" />
            <Text className="ml-2 text-xs text-rose-300 flex-1">
              {getErrorMessage(error)}
            </Text>
          </View>
        )}
      </View>

      {expanded && (
        <View className="mt-6">
          <Text className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-2">
            Available Reciters
          </Text>

          {isLoadingReciters ?
            <ActivityIndicator size="small" color="#0d9488" className="py-10" />
          : <ScrollView
              style={{ maxHeight: 350 }}
              showsVerticalScrollIndicator={false}
              className="px-1"
            >
              {recitations.map((item) => {
                const isSelected = selectedAudio === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setAudio(item.id)}
                    className={`mb-2 flex-row items-center rounded-2xl p-4 ${
                      isSelected ?
                        "bg-teal-50 border border-teal-100"
                      : "bg-slate-50"
                    }`}
                  >
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-teal-600" : "bg-slate-200"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-500"}`}
                      >
                        {item.name[0]}
                      </Text>
                    </View>
                    <Text
                      className={`ml-4 font-semibold ${isSelected ? "text-teal-900" : "text-slate-700"}`}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#0d9488"
                        className="ml-auto"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          }
        </View>
      )}

      {!expanded && (
        <View className="mt-4 items-center">
          <View className="h-1 w-8 rounded-full bg-slate-200" />
          <Text className="mt-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Swipe up to change Qari
          </Text>
        </View>
      )}
    </View>
  );
};
