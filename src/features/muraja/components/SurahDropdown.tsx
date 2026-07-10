import React, { useMemo } from "react";
import { Text } from "@/src/components/common/ui/Text"; 
import { View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useColorScheme } from "nativewind";

type DropDataType = {
  number: number;
  englishName: string;
};

interface ISurahDropDownProps {
  label?: string;
  surah: number | null;
  setSurah: (value: number) => void;
}

interface ISurahPageDropDown {
  label?: string;
  surah: number | null;
  page: number | null;
  setPage: (value: number) => void;
}

interface ICustomDropDown {
  page: number | null;
  setPage: (value: number) => void;
}

const useDropdownTheme = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return {
    isDark,
    bgColor: isDark ? "rgba(26, 33, 29)" : "#ffffff",
    borderColor: isDark ? "#334155" : "#e2e8f0",
    textColor: isDark ? "#f8fafc" : "#111827",
    placeholderColor: isDark ? "#64748b" : "#9ca3af",
    iconColor: isDark ? "#1d3f39" : "#276359",
    activeBg: isDark ? "#0f1512" : "#f8fafc",
  };
};

const SurahDropdown = ({ label, surah, setSurah }: ISurahDropDownProps) => {
  const { items, loading, error } = useLoadSurahData();
  const theme = useDropdownTheme();

  const currentValue = useMemo(() => {
    if (!surah || items.length === 0) return null;
    const found = items.find((i) => i.number === Number(surah));
    return found ? found.number : null;
  }, [surah, items]);

  if (loading)
    return (
      <View className="p-4">
        <Text className="text-muted">Loading Surahs...</Text>
      </View>
    );
  if (error) return <Text className="text-red-500 p-4">{error}</Text>;

  return (
    <View>
      {label && (
        <Text className="text-muted text-[10px] uppercase mb-2 ml-1 tracking-widest ">
          {label}
        </Text>
      )}
      <Dropdown
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: theme.borderColor,
          borderRadius: 16,
          backgroundColor: theme.bgColor,
        }}
        containerStyle={{
          backgroundColor: theme.bgColor,
          borderColor: theme.borderColor,
          borderRadius: 16,
        }}
        placeholderStyle={{
          fontSize: 16,
          color: theme.placeholderColor,
          fontFamily: "Rosemary",
        }}
        selectedTextStyle={{
          fontSize: 16,
          color: theme.textColor,
          fontFamily: "Rosemary",
        }}
        inputSearchStyle={{ 
          borderRadius: 12, 
          color: theme.textColor,
          borderColor: theme.borderColor,
          backgroundColor: theme.bgColor 
        }}
        activeColor={theme.activeBg}
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
            color={theme.iconColor}
            style={{ marginRight: 10 }}
          />
        )}
        renderItem={(item: DropDataType) => (
          <View className="flex-row justify-between items-center p-4">
            <Text
              className={`text-base ${
                item.number === surah ? "text-muted font-bold" : "text-text opacity-90"
              }`}
            >
              {item.englishName}
            </Text>
            {item.number === surah && (
              <Ionicons name="checkmark-circle" size={20} color={theme.iconColor} />
            )}
          </View>
        )}
      />
    </View>
  );
};

export const SurahPageDropdown = ({
  label,
  surah,
  page,
  setPage,
}: ISurahPageDropDown) => {
  const { items, loading } = useLoadSurahData();
  const theme = useDropdownTheme();

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

  const currentPage = useMemo(() => {
    if (!page || surahPages.length === 0) return null;
    const found = surahPages.find((p) => p.number === Number(page));
    return found ? found.number : null;
  }, [page, surahPages]);

  return (
    <View>
      {label && (
        <Text className="text-muted text-[10px] uppercase mb-2 ml-1 tracking-widest ">
          {label}
        </Text>
      )}
      <Dropdown
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: theme.borderColor,
          borderRadius: 16,
          backgroundColor: theme.bgColor,
        }}
        containerStyle={{
          backgroundColor: theme.bgColor,
          borderColor: theme.borderColor,
          borderRadius: 16,
        }}
        placeholderStyle={{ fontSize: 16, color: theme.placeholderColor, fontFamily: "Rosemary" }}
        selectedTextStyle={{
          fontSize: 16,
          color: theme.textColor,
          fontFamily: "Rosemary",
        }}
        inputSearchStyle={{ 
          borderRadius: 12, 
          color: theme.textColor,
          borderColor: theme.borderColor,
          backgroundColor: theme.bgColor 
        }}
        activeColor={theme.activeBg}
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
            color={theme.iconColor}
            style={{ marginRight: 10 }}
          />
        )}
        renderItem={(item) => (
          <View className="flex-row justify-between items-center p-4">
            <Text
              className={`text-base ${
                item.number === page ? "text-primary font-bold" : "text-text opacity-90"
              }`}
            >
              {item.label}
            </Text>
            {item.number === page && (
              <Ionicons name="checkmark-circle" size={20} color={theme.iconColor} />
            )}
          </View>
        )}
      />
    </View>
  );
};

export const CustomDropdown = ({ page, setPage }: ICustomDropDown) => {
  const theme = useDropdownTheme();
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
        borderColor: theme.borderColor,
        borderRadius: 16,
        backgroundColor: theme.bgColor,
      }}
      containerStyle={{
        backgroundColor: theme.bgColor,
        borderColor: theme.borderColor,
        borderRadius: 16,
      }}
      placeholderStyle={{
        fontSize: 16,
        color: theme.placeholderColor,
        fontFamily: "Rosemary",
      }}
      selectedTextStyle={{
        fontSize: 16,
        color: theme.textColor,
        fontFamily: "Rosemary",
      }}
      inputSearchStyle={{ 
        borderRadius: 12, 
        color: theme.textColor,
        borderColor: theme.borderColor,
        backgroundColor: theme.bgColor 
      }}
      activeColor={theme.activeBg}
      data={pages}
      search
      maxHeight={300}
      labelField="label"
      valueField="number"
      placeholder="Select"
      value={page}
      onChange={(item) => setPage(item.number)}
      renderLeftIcon={() => (
        <Ionicons
          name="document-text"
          size={18}
          color={theme.iconColor}
          style={{ marginRight: 10 }}
        />
      )}
      renderItem={(item) => (
        <View className="flex-row justify-between items-center p-4">
          <Text
            className={`text-sm ${
              item.number === page ? "text-primary font-bold" : "text-text opacity-90"
            }`}
            style={{
              fontFamily: "Rosemary",
            }}
          >
            {item.label}
          </Text>
          {item.number === page && (
            <Ionicons name="checkmark-circle" size={20} color={theme.iconColor} />
          )}
        </View>
      )}
    />
  );
};

export default SurahDropdown;
