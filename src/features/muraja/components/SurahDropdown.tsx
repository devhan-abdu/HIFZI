import React, { useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text"; 
import { View } from "react-native";

import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";

type DropDataType = {
  number: number;
  englishName: string;
};

interface ISurahDropDownProps {
  surah: number | null;
  setSurah: (value: number) => void;
}

interface ISurahPageDropDown {
  surah: number | null;
  page: number | null;
  setPage: (value: number) => void;
}

interface ICustomDropDown {
  page: number | null;
  setPage: (value: number) => void;
}

const SurahDropdown = ({ surah, setSurah }: ISurahDropDownProps) => {
  const { items, loading, error } = useLoadSurahData();

  const currentValue = useMemo(() => {
    if (!surah || items.length === 0) return null;
    const found = items.find((i) => i.number === Number(surah));
    return found ? found.number : null;
  }, [surah, items]);

  if (loading)
    return (
      <View className="p-4">
        <Text className="text-gray-400">Loading Surahs...</Text>
      </View>
    );
  if (error) return <Text className="text-red-500 p-4">{error}</Text>;

  return (
    <Dropdown
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        backgroundColor: "white",
      }}
      placeholderStyle={{
        fontSize: 16,
        color: "#9CA3AF",
        fontFamily: "Rosemary",
      }}
      selectedTextStyle={{
        fontSize: 16,
        color: "#111827",
        fontFamily: "Rosemary",
      }}
      inputSearchStyle={{ borderRadius: 12 }}
      data={items}
      search
      maxHeight={300}
      labelField="englishName"
      valueField="number"
      placeholder="Select Surah"
      value={currentValue}
      onChange={(item) => setSurah(item.number)}
      renderLeftIcon={() => (
        <Ionicons
          name="book"
          size={18}
          color="#276359"
          style={{ marginRight: 10 }}
        />
      )}
      renderItem={(item: DropDataType) => (
        <View className="flex-row justify-between items-center p-4">
          <Text
            className={`text-base ${
              item.number === surah ? "text-primary  " : "text-gray-700"
            }`}
          >
            {item.englishName}
          </Text>
          {item.number === surah && (
            <Ionicons name="checkmark-circle" size={20} color="#276359" />
          )}
        </View>
      )}
    />
  );
};

export const SurahPageDropdown = ({
  surah,
  page,
  setPage,
}: ISurahPageDropDown) => {
  const { items, loading } = useLoadSurahData();

  const surahPages = useMemo(() => {
    if (!surah || items.length === 0) return [];
    const foundSurah = items.find((item) => item.number === Number(surah));
    if (!foundSurah) return [];

    return Array.from(
      { length: foundSurah.endingPage - foundSurah.startingPage + 1 },
      (_, i) => {
        const pageNum = foundSurah.startingPage + i;
        return { number: pageNum, label: `Page ${pageNum}` };
      },
    );
  }, [surah, items]);

  // Force sync for page
  const currentPage = useMemo(() => {
    if (!page || surahPages.length === 0) return null;
    const found = surahPages.find((p) => p.number === Number(page));
    return found ? found.number : null;
  }, [page, surahPages]);

  return (
    <Dropdown
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        backgroundColor: "white",
      }}
      placeholderStyle={{ fontSize: 16, color: "#9CA3AF", fontFamily: "Rosemary", }}
      selectedTextStyle={{
        fontSize: 16,
        color: "#111827",
        fontFamily: "Rosemary",
      }}
      data={surahPages}
      search
      maxHeight={300}
      labelField="label"
      valueField="number"
      placeholder="Select Page"
      value={currentPage}
      onChange={(item) => setPage(item.number)}
      renderLeftIcon={() => (
        <Ionicons
          name="document-text"
          size={18}
          color="#276359"
          style={{ marginRight: 10 }}
        />
      )}
      renderItem={(item) => (
        <View className="flex-row justify-between items-center p-4">
          <Text
            className={`text-base ${
              item.number === page ? "text-primary  " : "text-gray-700"
            }`}
          >
            {item.label}
          </Text>
          {item.number === page && (
            <Ionicons name="checkmark-circle" size={20} color="#276359" />
          )}
        </View>
      )}
    />
  );
};

export const CustomDropdown = ({ page, setPage }: ICustomDropDown) => {
const pages = Array.from({ length: 604 }, (_, i) => ({
  label: `Page ${i + 1}`,
  number: i + 1,
}));
  return (
    <Dropdown
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        backgroundColor: "white",
      }}
      placeholderStyle={{
        fontSize: 16,
        color: "#9CA3AF",
        fontFamily: "Rosemary",
      }}
      selectedTextStyle={{
        fontSize: 16,
        color: "#111827",
        fontFamily: "Rosemary",
      }}
      data={pages}
      search
      maxHeight={300}
      labelField="label"
      valueField="number"
      placeholder="select"
      value={page}
      onChange={(item) => setPage(item.number)}
      renderLeftIcon={() => (
        <Ionicons
          name="document-text"
          size={18}
          color="#276359"
          style={{ marginRight: 10 }}
        />
      )}
      renderItem={(item) => (
        <View className="flex-row justify-between items-center p-4">
          <Text
            className={`text-sm ${
              item.number === page ? "text-primary  " : "text-gray-700"
            }`}
            style={{
              fontFamily: "Rosmery",
            }}
          >
            {item.label}
          </Text>
          {item.number === page && (
            <Ionicons name="checkmark-circle" size={20} color="#276359" />
          )}
        </View>
      )}
    />
  );
};



export default SurahDropdown;
