import React from "react";
import { Pressable, View } from "react-native";

import { useReaderStore } from "../hook/useReaderStore";
import { AyahBbox } from "../type";

interface AyahOverlayProps {
  ayahs: AyahBbox[];
  scale: number;
  width: number;
  height: number;
}

export const AyahOverlay = React.memo(
  ({ ayahs, scale, width, height }: AyahOverlayProps) => {
    const {
      playingAyah,
      selectedAyah,
      setMode,
      setSelectedAyah,
      uiMode,
    } = useReaderStore();

    const selectedVerseKey =
      selectedAyah ? `${selectedAyah.sura}:${selectedAyah.ayah}` : null;

    const getOverlayColor = (verseKey: string) => {
      if (playingAyah === verseKey) {
        return "rgba(34, 197, 94, 0.28)";
      }

      if (selectedVerseKey === verseKey) {
        return uiMode === "recitation" ?
          "rgba(59, 130, 246, 0.25)"
          : "rgba(20, 184, 166, 0.2)";
      }

      return "transparent";
    };

    return (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, width, height }}
      >
        {ayahs.map((ayah, index) => {
          const verseKey = `${ayah.sura}:${ayah.ayah}`;

          return (
            <Pressable
              key={`${verseKey}-${index}`}
              delayLongPress={220}
              onLongPress={() => {
                setSelectedAyah({ sura: ayah.sura, ayah: ayah.ayah });
                if (uiMode !== "recitation") {
                  setMode("idle");
                }
              }}
              style={{
                position: "absolute",
                left: ayah.min_x * scale,
                top: ayah.min_y * scale,
                width: (ayah.max_x - ayah.min_x) * scale,
                height: (ayah.max_y - ayah.min_y) * scale,
                backgroundColor: getOverlayColor(verseKey),
                borderRadius: 6,
              }}
            />
          );
        })}
      </View>
    );
  },
);

AyahOverlay.displayName = "AyahOverlay";
