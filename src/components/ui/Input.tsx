import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "../common/ui/Text";

interface IinputProps {
  label?: string;
  placeholder?: string;
  value: string;
  setValue: (text: string) => void;
  style?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  leftIcon?: React.ReactNode;
  [key: string]: any;
}

export default function Input({
  label,
  placeholder,
  value,
  setValue,
  style = "",
  rightIcon,
  onRightIconPress,
  leftIcon,
  ...rest
}: IinputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 ${style}`}>
      {label && (
        <Text className="text-black text-[9px]  uppercase tracking-widest mb-2 ml-1">
          {label}
        </Text>
      )}

      <View
        className={`
          w-full
          border-2 
          rounded-[20px]
          px-4
          flex-row
          items-center
          bg-gray-50
          ${isFocused ? "border-primary/40 bg-white" : "border-gray-100"}
        `}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          style={{
            fontFamily: "Rosemary",
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 py-3.5 text-slate-900  text-[15px]"
          {...rest}
        />

        {rightIcon && (
          <Pressable onPress={onRightIconPress} className="ml-2">
            {rightIcon}
          </Pressable>
        )}
      </View>
    </View>
  );
}
