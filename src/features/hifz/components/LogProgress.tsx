import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IHifzPlan } from "../types";

type LogProgressType = {
  plan: IHifzPlan;
  onClose: (close: boolean) => void;
};

type StatusTabType = {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
};

export default function LogProgress({ plan, onClose }: LogProgressType) {
  const target = plan.pages_per_day;
  const [pages, setPages] = useState(target);
  const [status, setStatus] = useState<"completed" | "partial" | "missed">(
    "completed",
  );
  const [notes, setNotes] = useState("");

  const updatePages = (newVal: number) => {
    const value = Math.max(0, newVal);
    setPages(value);
    if (value === 0) setStatus("missed");
    else if (value < target) setStatus("partial");
    else setStatus("completed");
  };

  return (
    <View className="flex-1 bg-white p-6 rounded-t-[40px]">
      <View className="bg-[#2D6A4F] p-6 rounded-[32px] mb-8">
        <Text className="text-white/70   text-xs uppercase mb-1">
          Today's Target
        </Text>
        <Text className="text-white text-2xl  mb-4">Surah Al-Baqarah</Text>

        <View className="flex-row items-center border-t border-white/10 pt-4">
          <View className="mr-8">
            <Text className="text-white text-3xl ">{target}</Text>
            <Text className="text-white/60 text-xs">Pages</Text>
          </View>
          <View>
            <Text className="text-white text-lg  ">Pages 12 - 14</Text>
            <Text className="text-white/60 text-xs">Juz 1</Text>
          </View>
        </View>
      </View>
      <Text className="text-xl  mb-4">How did it go?</Text>
      <View className="flex-row justify-between mb-8">
        <StatusTab
          label="Completed"
          icon="checkmark-circle"
          active={status === "completed"}
          onPress={() => {
            setStatus("completed");
            setPages(target);
          }}
        />
        <StatusTab
          label="Partial"
          icon="contrast"
          active={status === "partial"}
          onPress={() => setStatus("partial")}
        />
        <StatusTab
          label="Missed"
          icon="close-circle"
          active={status === "missed"}
          onPress={() => {
            setStatus("missed");
            setPages(0);
          }}
        />
      </View>
      <View className="bg-gray-50 p-6 rounded-3xl flex-row items-center justify-between mb-6">
        <View>
          <Text className=" text-lg">Pages Memorized</Text>
          <Text className="text-gray-400 text-xs">Target: {target} pages</Text>
        </View>
        <View className="flex-row items-center bg-white rounded-2xl p-2 border border-gray-100">
          <Pressable onPress={() => updatePages(pages - 1)} className="p-2">
            <Ionicons name="remove" size={24} color="#2D6A4F" />
          </Pressable>
          <Text className="text-2xl  px-4">{pages}</Text>
          <Pressable onPress={() => updatePages(pages + 1)} className="p-2">
            <Ionicons name="add" size={24} color="#2D6A4F" />
          </Pressable>
        </View>
      </View>
      <Text className="  text-gray-400 uppercase text-xs mb-2">
        Optional Notes
      </Text>
      <TextInput
        multiline
        placeholder="Any difficulties with specific ayahs?"
        className="bg-gray-50 p-4 rounded-3xl h-32 text-start"
        textAlignVertical="top"
        value={notes}
        onChangeText={setNotes}
      />
      \{" "}
      <Pressable
        onPress={() => onClose(false)}
        className="bg-[#2D6A4F] h-16 rounded-2xl flex-row items-center justify-center mt-8"
      >
        <Text className="text-white  text-lg mr-2">Save Today's Progress</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </Pressable>
    </View>
  );
}

function StatusTab({ label, icon, active, onPress }: StatusTabType) {
  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center p-4 rounded-3xl w-[31%] border-2 ${
        active ? "bg-white border-[#2D6A4F]" : "bg-gray-50 border-transparent"
      }`}
    >
      <Ionicons
        name={icon as any}
        size={24}
        color={active ? "#2D6A4F" : "#9CA3AF"}
      />
      <Text className={`  mt-2 ${active ? "text-[#2D6A4F]" : "text-gray-400"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
