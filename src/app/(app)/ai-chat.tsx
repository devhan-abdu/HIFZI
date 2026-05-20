import { Header } from "@/src/components/navigation/Header";
import { Text } from "@/src/components/common/ui/Text";
import { askQuranQuestion } from "@/src/features/ai/services/quranAI";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AIChatScreen() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      text: "Assalamu Alaikum! I'm your Quran learning assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      scrollToBottom();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const sendQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    Keyboard.dismiss();
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed, timestamp: new Date() },
    ]);
    setQuestion("");
    setLoading(true);

    try {
      const answer = await askQuranQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: answer, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I focus on Quran learning. Ask me about tafsir, memorization, or your progress.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const footerLift =
    Platform.OS === "android" && keyboardHeight > 0 ? keyboardHeight : 0;
  const tabBarOffset = 70 + Math.max(insets.bottom, 10) + 12;
  const footerPadding = keyboardHeight > 0 ? 12 : tabBarOffset;

  return (
    <View className="flex-1 bg-white">
      <Header title="HIFZI" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 bg-slate-50">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: keyboardHeight > 0 ? 16 : 24,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            onContentSizeChange={() => scrollToBottom(false)}
          >
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <View
                  key={`${message.role}-${index}-${message.timestamp.getTime()}`}
                  className={`mb-4 flex-row ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-2 mt-1 shrink-0">
                      <Ionicons name="sparkles" size={16} color="#047857" />
                    </View>
                  )}

                  <View className={`max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
                    <View
                      className={`rounded-2xl px-4 py-3 ${
                        isUser
                          ? "bg-emerald-700 rounded-tr-sm"
                          : "bg-white shadow-sm border border-slate-100 rounded-tl-sm"
                      }`}
                    >
                      <Text
                        className={`text-[15px] leading-6 ${
                          isUser ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {message.text}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-1 px-1">
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>

                  {isUser && (
                    <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center ml-2 mt-1 shrink-0">
                      <Ionicons name="person" size={16} color="#64748b" />
                    </View>
                  )}
                </View>
              );
            })}

            {loading && (
              <View className="mb-4 flex-row justify-start">
                <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-2 mt-1">
                  <Ionicons name="sparkles" size={16} color="#047857" />
                </View>
                <View className="rounded-2xl rounded-tl-sm bg-white shadow-sm border border-slate-100 px-4 py-3">
                  <Text className="text-[15px] text-slate-500">Thinking…</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View
            className="bg-white border-t border-slate-100 px-4 pt-3"
            style={{
              marginBottom: footerLift,
              paddingBottom: footerPadding,
            }}
          >
            <View className="flex-row items-end bg-slate-50 border border-slate-200 rounded-3xl px-3 py-1.5 min-h-[48px]">
              <TextInput
                ref={inputRef}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask me anything about Quran…"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-slate-900 text-base px-1 py-2 mr-2"
                multiline
                maxLength={2000}
                blurOnSubmit={false}
                onFocus={() => scrollToBottom()}
                style={{ minHeight: 36, maxHeight: 120 }}
                textAlignVertical="center"
              />
              <Pressable
                onPress={sendQuestion}
                disabled={loading || !question.trim()}
                className={`w-10 h-10 rounded-full items-center justify-center mb-0.5 shrink-0 ${
                  loading || !question.trim() ? "bg-slate-200" : "bg-emerald-700"
                }`}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={loading || !question.trim() ? "#94a3b8" : "#fff"}
                />
              </Pressable>
            </View>
            <Text className="text-center text-[10px] text-slate-400 mt-2">
              Hifzi AI can make mistakes. Verify important information.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
