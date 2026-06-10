import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { useHifzTest } from "@/src/features/hifz/hooks/useHifzTest";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Text as QuranText } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSession } from "@/src/hooks/useSession";
import { TestService } from "@/src/features/test/services/testService";
import { useEffect } from "react";

export default function Test() {
  const { pages } = useLocalSearchParams();

  const parsedPages = useMemo(() => {
    return pages ? JSON.parse(pages as string) : [];
  }, [pages]);

  const { questions, loading, refresh } = useHifzTest(parsedPages);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [results, setResults] = useState<{ question: any; score: number; page: number }[]>([]);
  const { user } = useSession();
  const { type, planId } = useLocalSearchParams();

  const resetUI = () => {
    setCurrentIndex(0);
    setScore(0);
    setRevealed(false);
    setIsFinished(false);
    setIsSaving(false);
    setShowReview(false);
    setResults([]);
  };

  const handleReturn = async () => {
    if (isSaving || !user?.id) return;
    setIsSaving(true);
    try {
      await TestService.saveResult({
        userId: user.id,
        planId: planId && !isNaN(Number(planId)) ? Number(planId) : undefined,
        type: (type as any) || "HIFZ",
        pagesRange: parsedPages,
        score,
        totalQuestions: questions.length,
      });
      router.replace("/(app)/evaluation");
    } catch (e) {
      console.error("Failed to save test:", e);
      router.replace("/(app)/evaluation");
    }
  };

  useEffect(() => {
    resetUI();
  }, [type, pages, planId]);

  if (loading)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#276359" />
        <Text className="text-slate-500 mt-3">Generating Test...</Text>
      </View>
    );

  if (!questions || questions.length === 0)
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="document-outline" size={48} color="#94a3b8" />
        <Text className="text-slate-500 mt-4 text-center">No questions found for these pages.</Text>
      </View>
    );

  const currentQuestion = questions[currentIndex];

  const handleGrade = (points: number) => {
    setScore((prev) => prev + points);
    setResults((prev) => [
      ...prev,
      { question: currentQuestion, score: points, page: currentQuestion.page || 0 },
    ]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRevealed(false);
    } else {
      setIsFinished(true);
    }
  };

  // ─── Completion Screen ────────────────────────────────────────────────────────
  if (isFinished) {
    const totalQ = questions.length;
    const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    const isPerfect = pct === 100;
    const isGood = pct >= 70;

    return (
      <Screen className="px-0">
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Score Hero ──────────────────────────────────────────────── */}
          <View className="items-center mb-10">
            <View
              className={`w-28 h-28 rounded-full items-center justify-center mb-5 ${
                isPerfect
                  ? "bg-emerald-50 border-2 border-emerald-200"
                  : isGood
                  ? "bg-primary/10 border-2 border-primary/30"
                  : "bg-amber-50 border-2 border-amber-200"
              }`}
            >
              <Ionicons
                name={isPerfect ? "trophy" : isGood ? "star" : "school-outline"}
                size={52}
                color={isPerfect ? "#10b981" : isGood ? "#276359" : "#f59e0b"}
              />
            </View>

            <Text className="text-3xl text-slate-900 mb-1">
              {isPerfect ? "MashAllah! Perfect!" : isGood ? "Well Done!" : "Keep Practicing!"}
            </Text>
            <Text className="text-slate-400 text-sm mb-6">
              {parsedPages.length} page{parsedPages.length !== 1 ? "s" : ""} tested
            </Text>

            {/* Score ring */}
            <View className="flex-row items-end gap-1">
              <Text className="text-5xl text-primary">{pct}</Text>
              <Text className="text-xl text-slate-400 mb-1">%</Text>
            </View>
            <Text className="text-slate-400 text-sm mt-1">
              {Math.round(score)} correct out of {totalQ}
            </Text>
          </View>

          {/* ── Quick breakdown pills ──────────────────────────────────── */}
          <View className="flex-row gap-3 mb-10">
            {[
              { label: "Correct", value: results.filter((r) => r.score === 1).length, color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
              { label: "Partial", value: results.filter((r) => r.score === 0.5).length, color: "bg-amber-50 border-amber-100", text: "text-amber-700" },
              { label: "Missed", value: results.filter((r) => r.score === 0).length, color: "bg-red-50 border-red-100", text: "text-red-600" },
            ].map((item) => (
              <View key={item.label} className={`flex-1 py-4 rounded-2xl border ${item.color} items-center`}>
                <Text className={`text-2xl ${item.text}`}>{item.value}</Text>
                <Text className={`text-[10px] uppercase tracking-widest mt-0.5 ${item.text}`}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Review Answers (hidden by default) ────────────────────── */}
          <Pressable
            onPress={() => setShowReview((v) => !v)}
            className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl mb-4"
          >
            <Text className="text-slate-700">Review Answers</Text>
            <Ionicons
              name={showReview ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748b"
            />
          </Pressable>

          {showReview && (
            <View className="gap-y-3 mb-8">
              {results.map((res, i) => {
                const isCorrect = res.score === 1;
                const isPartial = res.score === 0.5;
                const borderColor = isCorrect
                  ? "border-emerald-100"
                  : isPartial
                  ? "border-amber-100"
                  : "border-red-100";
                const scoreColor = isCorrect
                  ? "text-emerald-600"
                  : isPartial
                  ? "text-amber-600"
                  : "text-red-500";

                const isBoundary = res.question.type === "BOUNDARY";
                const labelA = isBoundary ? "Start" : "Next";
                const labelB = isBoundary ? "End" : "Prev";
                const answerA = isBoundary ? res.question.answer.start : res.question.answer.next;
                const answerB = isBoundary ? res.question.answer.end : res.question.answer.previous;

                return (
                  <View key={i} className={`bg-white p-5 rounded-3xl border ${borderColor}`}>
                    {/* Header row */}
                    <View className="flex-row justify-between items-center mb-4">
                      <View className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                        <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
                          {res.question.type}
                        </Text>
                      </View>
                      <Text className={`text-sm ${scoreColor}`}>
                        {isCorrect ? "✓ Correct" : isPartial ? "½ Partial" : "✗ Missed"}
                      </Text>
                    </View>

                    {/* Question Ayah */}
                    <QuranText
                      style={{
                        fontFamily: "Uthman",
                        textAlign: "right",
                        fontSize: 22,
                        lineHeight: 50,
                        color: "#1e293b",
                        marginBottom: 16,
                      }}
                    >
                      {res.question.question}
                    </QuranText>

                    {/* Two answers */}
                    {res.question.type !== "CHOICE" ? (
                      <View className="gap-y-3">
                        {[
                          { label: labelA, text: answerA },
                          { label: labelB, text: answerB },
                        ].map((ans) =>
                          ans.text ? (
                            <View key={ans.label} className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                              <Text className="text-primary text-[10px] uppercase tracking-widest mb-2">
                                {ans.label}
                              </Text>
                              <QuranText
                                style={{
                                  fontFamily: "Uthman",
                                  textAlign: "right",
                                  fontSize: 20,
                                  lineHeight: 40,
                                  color: "#276359",
                                }}
                              >
                                {ans.text}
                              </QuranText>
                            </View>
                          ) : null
                        )}
                      </View>
                    ) : (
                      <View className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <Text className="text-primary text-[10px] uppercase tracking-widest mb-2">
                          Correct
                        </Text>
                        <QuranText
                          style={{
                            fontFamily: "Uthman",
                            textAlign: "right",
                            fontSize: 20,
                            lineHeight: 40,
                            color: "#276359",
                          }}
                        >
                          {res.question.answer.correct}
                        </QuranText>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          <View className="gap-y-3 pb-24">
            <Pressable
              onPress={handleReturn}
              disabled={isSaving}
              className={`py-4 rounded-2xl items-center justify-center ${
                isSaving ? "bg-slate-300" : "bg-primary"
              }`}
            >
              <View className="flex-row items-center gap-x-2">
                {isSaving && <ActivityIndicator color="white" size="small" />}
                <Text className="text-white text-base">
                  {isSaving ? "Saving Results..." : "Return to Dashboard"}
                </Text>
              </View>
            </Pressable>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => { resetUI(); refresh(); }}
                className="flex-1 bg-white border border-slate-200 py-3.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-slate-700">New Test</Text>
              </Pressable>
              <Pressable
                onPress={resetUI}
                className="flex-1 bg-slate-50 border border-slate-100 py-3.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-slate-500">Retake</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ─── Active Question Screen ───────────────────────────────────────────────────
  return (
    <Screen>
      <ScreenContent>
        {/* Progress bar */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <Text className="text-primary text-sm">Score: {score}</Text>
          </View>
          <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </View>
        </View>

        {/* Question card */}
        <View className="bg-white border border-slate-100 rounded-3xl p-6 mb-6">
          <View className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg self-start mb-4">
            <Text className="text-slate-400 text-[10px] uppercase tracking-widest">
              {currentQuestion.type === "BOUNDARY"
                ? "Boundary"
                : currentQuestion.type === "CHOICE"
                ? "Multiple Choice"
                : "Sequence"}
            </Text>
          </View>

          <Text className="text-slate-400 text-xs mb-3">Based on this Ayah:</Text>
          <QuranText
            style={{
              fontFamily: "Uthman",
              textAlign: "right",
              fontSize: 24,
              lineHeight: 64,
              color: "#0f172a",
            }}
          >
            {currentQuestion.question}
          </QuranText>
        </View>

        {/* Prompt */}
        <View className="bg-slate-50 py-3 px-4 rounded-xl border border-slate-200 mb-6">
          <Text className="text-slate-600 text-sm text-center leading-relaxed">
            {currentQuestion.type === "BOUNDARY"
              ? currentQuestion.crossesSurah
                ? "What is the last ayah of the first surah and the first ayah of the second surah on this page?"
                : "Recite the first ayah (Start) and last ayah (End) of this page"
              : "What comes before (Prev) and after (Next) this ayah?"}
          </Text>
        </View>

        {/* CHOICE options */}
        {currentQuestion.type === "CHOICE" && (
          <View className="gap-y-3">
            {currentQuestion.answer.options.map((opt: string, idx: number) => (
              <Pressable
                key={idx}
                onPress={() => handleGrade(opt === currentQuestion.answer.correct ? 1 : 0)}
                className="bg-white border-2 border-slate-100 p-4 rounded-2xl active:bg-primary/5 active:border-primary/30"
              >
                <QuranText
                  style={{
                    fontFamily: "Uthman",
                    textAlign: "right",
                    fontSize: 20,
                    lineHeight: 36,
                    color: "#0f172a",
                  }}
                >
                  {opt}
                </QuranText>
              </Pressable>
            ))}
          </View>
        )}

        {/* SEQUENCE / BOUNDARY revealed answers — two-part layout */}
        {currentQuestion.type !== "CHOICE" && revealed && (() => {
          const isBoundary = currentQuestion.type === "BOUNDARY";
          const labelA = isBoundary ? "Start" : "Next";
          const labelB = isBoundary ? "End" : "Prev";
          const answerA = isBoundary ? currentQuestion.answer.start : currentQuestion.answer.next;
          const answerB = isBoundary ? currentQuestion.answer.end : currentQuestion.answer.previous;

          return (
            <View className="gap-y-3">
              {/* Surah boundary badges */}
              {!isBoundary && currentQuestion.answer.nextSoraid !== currentQuestion.currentSoraid && (
                <View className="bg-slate-100 py-1.5 px-3 self-end rounded-lg border border-slate-200">
                  <Text className="text-slate-500 text-[10px] uppercase tracking-widest">— End of Surah —</Text>
                </View>
              )}
              {[
                { label: labelA, text: answerA },
                { label: labelB, text: answerB },
              ].map((ans) =>
                ans.text ? (
                  <View key={ans.label} className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                    <Text className="text-primary text-[10px] uppercase tracking-widest mb-3">
                      {ans.label}
                    </Text>
                    <QuranText
                      style={{
                        fontFamily: "Uthman",
                        textAlign: "right",
                        fontSize: 22,
                        lineHeight: 46,
                        color: "#276359",
                      }}
                    >
                      {ans.text}
                    </QuranText>
                  </View>
                ) : null
              )}
              {!isBoundary && currentQuestion.answer.prevSoraid !== currentQuestion.currentSoraid && (
                <View className="bg-slate-100 py-1.5 px-3 self-end rounded-lg border border-slate-200">
                  <Text className="text-slate-500 text-[10px] uppercase tracking-widest">— Start of Surah —</Text>
                </View>
              )}
            </View>
          );
        })()}
      </ScreenContent>

      <ScreenFooter>
        {currentQuestion.type !== "CHOICE" && (
          !revealed ? (
            <Pressable
              onPress={() => setRevealed(true)}
              className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center"
            >
              <Ionicons name="eye-outline" size={18} color="white" />
              <Text className="text-white text-base ml-2">Reveal Answer</Text>
            </Pressable>
          ) : (
            <View className="gap-y-3 w-full">
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest text-center">
                How well did you recall?
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleGrade(0)}
                  className="flex-1 bg-red-50 border border-red-100 h-14 rounded-2xl items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#ef4444" />
                  <Text className="text-red-500 text-[10px] mt-0.5">Missed</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleGrade(0.5)}
                  className="flex-1 bg-amber-50 border border-amber-100 h-14 rounded-2xl items-center justify-center"
                >
                  <Text className="text-amber-500 text-lg">½</Text>
                  <Text className="text-amber-500 text-[10px]">Partial</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleGrade(1)}
                  className="flex-1 bg-emerald-50 border border-emerald-100 h-14 rounded-2xl items-center justify-center"
                >
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                  <Text className="text-emerald-600 text-[10px] mt-0.5">Correct</Text>
                </Pressable>
              </View>
            </View>
          )
        )}
      </ScreenFooter>
    </Screen>
  );
}
