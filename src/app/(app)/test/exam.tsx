import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { useHifzTest } from "@/src/features/hifz/hook/useHifzTest";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Text as QuranText } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function Test() {
  const { pages } = useLocalSearchParams()
  
  const parsedPages = pages ? JSON.parse(pages as string) : []
  const { questions, loading, refresh } = useHifzTest(parsedPages);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const resetUI = () => {
    setCurrentIndex(0);
    setScore(0);
    setRevealed(false);
    setIsFinished(false);
  };

  if (loading)
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Generating Test...</Text>
      </View>
    );
  if (!questions || questions.length === 0)
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No questions found.</Text>
      </View>
    );

  const currentQuestion = questions[currentIndex];

  const handleGrade = (points: number) => {
    setScore((prev) => prev + points);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRevealed(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <Screen>
        <View className="flex-col items-center justify-center my-auto">
          <Ionicons name="trophy" size={80} color="#276359" />
          <Text className="text-3xl  mt-4">Test Complete!</Text>
          <Text className="text-xl text-slate-500 mt-2">
            Your Score: {score} / {questions.length}
          </Text>

          <View className="flex-row gap-4 mt-10">
            <Pressable
              onPress={resetUI}
              className="bg-slate-100 py-2 px-4 rounded-lg"
            >
              <Text className="text-lg ">Retake</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                resetUI();
                refresh();
              }}
              className="bg-primary py-2  px-4 rounded-lg"
            >
              <Text className="text-white  text-lg">New Test</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen>
      <ScreenContent>
        <View className="flex-row items-center justify-between mb-8 bg-black/2  p-4 rounded-md border border-slate-100">
          <View>
            <Text className="text-slate-700   uppercase text-[10px] tracking-widest">
              Progress
            </Text>
            <Text className="text-lg">
              {currentIndex + 1} / {questions.length}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-slate-700  uppercase text-[10px] tracking-widest">
              Current Score
            </Text>
            <Text className="text-lg text-primary">{score}</Text>
          </View>
        </View>

        <View className=" p-6 border-t border-slate-100 ">
          <Text className="text-slate-400 text-xs mb-2">
            Based on the Ayah:
          </Text>
          <QuranText
            className="text-2xl text-right  mb-6"
            style={{
              fontFamily: "Uthman",
              textAlign: "right",
              lineHeight: 62,
            }}
          >
            {currentQuestion.question}
          </QuranText>

          <View className="bg-slate-50 py-2.5 rounded-lg border  border-slate-200">
            <Text className="text-slate-600 text-lg text-center">
              {currentQuestion.type === "BOUNDARY" ?
                "Recite the first and last ayah of this page"
              : "What comes before and after this ?"}
            </Text>
          </View>

          {revealed && (
            <View className="mt-8 pt-8 border-t border-slate-100 flex-col gap-4">
              <View className="flex-col gap-4">
                <Text className="text-xl" style={{ fontFamily: "Rosemary" }}>
                  {currentQuestion.type === "BOUNDARY" ? "Start:" : "Next:"}
                </Text>
                <QuranText
                  className="font-Amiri text-right text-2xl text-primary"
                  style={{
                    fontFamily: "Uthman",
                    textAlign: "right",
                    lineHeight: 42,
                  }}
                >
                  {currentQuestion.type === "BOUNDARY" ?
                    currentQuestion.answer.start
                  : currentQuestion.answer.next}
                </QuranText>
              </View>
              <View className="flex-col gap-4">
                <Text className="text-xl" style={{ fontFamily: "Rosemary" }}>
                  {currentQuestion.type === "BOUNDARY" ? "ENd:" : "previous:"}
                </Text>
                <QuranText
                  className="font-Amiri text-right text-2xl text-primary"
                  style={{
                    fontFamily: "Uthman",
                    textAlign: "right",
                    lineHeight: 42,
                  }}
                >
                  {currentQuestion.type === "BOUNDARY" ?
                    currentQuestion.answer.end
                  : currentQuestion.answer.previous}
                </QuranText>
              </View>
            </View>
          )}
        </View>
      </ScreenContent>
      <ScreenFooter>
        {!revealed ?
          <Pressable
            onPress={() => setRevealed(true)}
            className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/20"
          >
            <Text className="text-white  text-lg">REVEAL ANSWER</Text>
          </Pressable>
        : <View className="flex-row gap-4 w-full">
            <Pressable
              onPress={() => handleGrade(0)}
              className="flex-1 bg-white h-14 rounded-md items-center justify-center border-2 border-slate-100 shadow-sm "
            >
              <View className="bg-red-500 p-2 rounded-full">
                <Ionicons name="close" size={16} color="white" />
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleGrade(0.5)}
              className="flex-1 bg-white h-14 rounded-md items-center justify-center border-2 border-slate-100  shadow-sm"
            >
              <Text className="text-xl  text-slate-400"> 1/2</Text>
            </Pressable>

            <Pressable
              onPress={() => handleGrade(1)}
              className="flex-1 bg-white h-14 rounded-md items-center justify-center border-2 border-slate-100 shadow-sm "
            >
              <View className="bg-emerald-500 p-2 rounded-full">
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            </Pressable>
          </View>
        }
      </ScreenFooter>
    </Screen>
  );
}
