import { Header } from "@/src/components/navigation/Header";
import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { askQuranQuestion } from "@/src/features/ai/services/quranAI";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { 
  Pressable, 
  View, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
};

export default function AIChatScreen() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      text: "Assalamu Alaikum! I'm your Quran learning assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);

  // ⚡ AUTO SCROLL ON NEW MESSAGE
  // --------------------------------------------------
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  const sendQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed, timestamp: new Date() }]);
    setQuestion("");
    setLoading(true);

    try {
      const answer = await askQuranQuestion(trimmed);

      setMessages((prev) => [...prev, { role: "assistant", text: answer, timestamp: new Date() }]);
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

  return (
    <>
      <Header title="HIFZI" />

      <Screen>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View className="flex-1 bg-slate-50">
            {/* --------------------------------------------------
                CHAT WINDOW
            -------------------------------------------------- */}
            <ScrollView
              ref={scrollRef}
              className="flex-1 px-4 pt-4"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <View
                    key={`${message.role}-${index}`}
                    className={`mb-6 flex-row ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3 mt-1">
                        <Ionicons name="sparkles" size={16} color="#047857" />
                      </View>
                    )}
                    
                    <View
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        isUser 
                          ? "bg-emerald-700 rounded-tr-sm" 
                          : "bg-white shadow-sm border border-slate-100 rounded-tl-sm"
                      }`}
                    >
                      <Text className={`text-[15px] leading-6 ${isUser ? "text-white" : "text-slate-800"}`}>
                        {message.text}
                      </Text>
                    </View>

                    {isUser && (
                      <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center ml-3 mt-1 overflow-hidden">
                        <Ionicons name="person" size={16} color="#64748b" />
                      </View>
                    )}
                  </View>
                );
              })}

              {loading && (
                <View className="mb-6 flex-row justify-start">
                  <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3 mt-1">
                    <Ionicons name="sparkles" size={16} color="#047857" />
                  </View>
                  <View className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white shadow-sm border border-slate-100 p-4">
                    <Text className="text-[15px] text-slate-500">Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* --------------------------------------------------
                INPUT
            -------------------------------------------------- */}
            <View className="px-4 py-3 bg-white border-t border-slate-100" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <View className="flex-row items-end bg-slate-50 border border-slate-200 rounded-3xl px-4 py-2 min-h-[50px] max-h-[120px]">
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask me anything about Quran..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-slate-900 text-base py-2 mr-2"
                  multiline
                  style={{ minHeight: 34, maxHeight: 100 }}
                />
                <Pressable
                  onPress={sendQuestion}
                  disabled={loading || !question.trim()}
                  className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${
                    loading || !question.trim() ? "bg-slate-200" : "bg-emerald-700"
                  }`}
                >
                  <Ionicons name="arrow-up" size={20} color={loading || !question.trim() ? "#94a3b8" : "#fff"} />
                </Pressable>
              </View>
              <Text className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                Hifzi AI can make mistakes. Verify important information.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </>
  );
}
