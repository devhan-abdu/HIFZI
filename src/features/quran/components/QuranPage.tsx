import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";

import { Text } from "@/src/components/common/ui/Text";

import { useAyahBBoxByPage } from "../hook/useAyahBBoxByPage";
import { PageData } from "../type";
import { AyahOverlay } from "./AyahOverlay";

const SOURCE_PAGE_WIDTH = 1260;
const SOURCE_PAGE_HEIGHT = 2045;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 40;

interface Props {
  pageNumber: number;
  uri?: string;
  pageWidth: number;
  pageHeight: number;
  meta?: PageData;
}

export const QuranPage = React.memo(
  ({ pageNumber, uri, pageWidth, pageHeight, meta }: Props) => {
    const { bboxes } = useAyahBBoxByPage(pageNumber);

    if (!uri || !meta) {
      return null;
    }

    const availableHeight = Math.max(pageHeight - HEADER_HEIGHT - FOOTER_HEIGHT, 1);
    const scale = Math.min(
      pageWidth / SOURCE_PAGE_WIDTH,
      availableHeight / SOURCE_PAGE_HEIGHT,
    );
    const renderedWidth = SOURCE_PAGE_WIDTH * scale;
    const renderedHeight = SOURCE_PAGE_HEIGHT * scale;

    return (
      <View style={{ width: pageWidth, height: pageHeight }}>
        <View style={{ height: HEADER_HEIGHT }} className="justify-end">
          <View className="flex-row justify-between px-8">
            <Text className="tracking-widest">{meta?.name ?? "Loading..."}</Text>
            <Text className="tracking-widest">
              Juz {meta?.juz ?? "-"} · Hizb {meta?.hizb ?? "-"}
            </Text>
          </View>
        </View>

        <View className="flex-1 items-center justify-center">
          <View style={{ width: renderedWidth, height: renderedHeight }}>
            <Image
              style={{ width: renderedWidth, height: renderedHeight }}
              source={uri}
              contentFit="fill"
              transition={250}
            />
            <AyahOverlay
              ayahs={bboxes}
              scale={scale}
              width={renderedWidth}
              height={renderedHeight}
            />
          </View>
        </View>

        <View className="mx-auto flex items-center justify-center" style={{ height: FOOTER_HEIGHT }}>
          <Text className="mb-4 text-lg">{pageNumber}</Text>
        </View>
      </View>
    );
  },
);

QuranPage.displayName = "QuranPage";
