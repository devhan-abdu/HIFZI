import { Header } from "@/src/components/navigation/Header";
import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { askQuranQuestion } from "@/src/features/ai/services/quranAI";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { 
  Pressable, 
  View, 
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Input from "@/src/components/ui/Input";

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
    }, 50);
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
      <Header title="Quran AI" />

      <Screen>
        <ScreenContent>
          <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">
            Assistant
          </Text>

          <Text className="text-slate-900 text-2xl mb-4">Quran Questions</Text>

          {/* --------------------------------------------------
              CHAT WINDOW
          -------------------------------------------------- */}
          <ScrollView
            ref={scrollRef}
            className="rounded-2xl bg-white border border-slate-200 p-3 mb-4"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                className={`mb-3 rounded-xl p-3 ${
                  message.role === "assistant" ?
                    "bg-slate-100"
                  : "bg-emerald-100"
                }`}
              >
                <Text className="text-[11px] text-slate-500 uppercase mb-1">
                  {message.role === "assistant" ? "Quran AI" : "You"}
                </Text>

                <Text className="text-slate-900 text-sm">{message.text}</Text>
              </View>
            ))}

            {loading && (
              <View className="rounded-xl p-3 bg-slate-100">
                <Text className="text-slate-500 text-sm">Thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* --------------------------------------------------
              INPUT
          -------------------------------------------------- */}
          <Input
            value={question}
            setValue={setQuestion}
            placeholder="Ask about tafsir, ayah meaning, or memorization tips"
            returnKeyType="send"
            onSubmitEditing={sendQuestion}
          />

          <Pressable
            onPress={sendQuestion}
            disabled={loading || !question.trim()}
            className={`rounded-xl py-3 px-4 items-center flex-row justify-center ${
              loading || !question.trim() ? "bg-slate-300" : "bg-emerald-700"
            }`}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text className="text-white ml-2">
              {loading ? "Sending..." : "Send"}
            </Text>
          </Pressable>
        </ScreenContent>
      </Screen>
    </>
  );
}
