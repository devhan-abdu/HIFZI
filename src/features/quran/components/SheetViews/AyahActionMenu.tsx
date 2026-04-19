import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReaderStore } from "../../hook/useReaderStore";
import { useBookmarks } from "../../hook/useBookmarks";

export const AyahActionMenu = () => {
  const { setMode, selectedAyah } = useReaderStore();
  const {
    isBookmarked,
    addBookmarkByVerseKey,
    removeBookmarkByVerseKey,
  } = useBookmarks();

  const ayahLabel =
    selectedAyah ? `${selectedAyah.sura}:${selectedAyah.ayah}` : "None";

  const isSelectedBookmarked = selectedAyah ? isBookmarked(`${selectedAyah.sura}:${selectedAyah.ayah}`) : false;

  const handleBookmarkToggle = async () => {
    if (!selectedAyah) return;
    const key = `${selectedAyah.sura}:${selectedAyah.ayah}`;
    if (isSelectedBookmarked) {
      await removeBookmarkByVerseKey(key);
    } else {
      await addBookmarkByVerseKey(key);
    }
  };

  const actions = [
    {
      id: "play",
      label: "Play",
      icon: "play-circle",
      mode: "recitation",
      color: "#22c55e",
      onPress: () => setMode("recitation"),
    },
    { 
      id: "bookmark",
      label: isSelectedBookmarked ? "Remove Bookmark" : "Bookmark", 
      icon: isSelectedBookmarked ? "bookmark" : "bookmark-outline", 
      mode: "bookmarking", 
      color: "#000",
      onPress: () => void handleBookmarkToggle(),
    },
  ];

  return (
    <View className="flex-row flex-wrap justify-between p-4">
      <Text className="w-full text-center text-gray-500 mb-4">
        Ayah {ayahLabel}
      </Text>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          onPress={action.onPress}
          className="items-center w-[22%]"
        >
          <View
            style={{ backgroundColor: action.color }}
            className="p-3 rounded-2xl mb-2"
          >
            <Ionicons name={action.icon as any} size={24} color="white" />
          </View>
          <Text className="text-[10px] font-medium text-gray-600 text-center">
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
