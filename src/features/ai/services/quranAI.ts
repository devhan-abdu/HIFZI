import { supabase } from "@/src/lib/supabase";

const DEFAULT_FALLBACK = "Keep following your plan and stay consistent!";
const QURAN_ONLY_FALLBACK = "I focus on Quran learning. Ask me about tafsir or your progress.";

/**
 * Utility to extract text from whatever format the Edge Function returns
 */
function extractText(payload: any): string | null {
  if (!payload) return null;
  return payload.answer || payload.explanation || payload.text || null;
}

/**
 * Explains a memorization plan based on user performance
 */
export async function explainPlan(summary: any, suggestion: any): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("explain-plan", {
      body: {summary, suggestion },
    });
    if (error) throw error;
    const data2 = extractText(data)
    console.log(data ,"what the backend")
    return extractText(data) ?? DEFAULT_FALLBACK;
  } catch (err) {
    // here thir  is an error
    console.log("Plan Error:", err);
    return DEFAULT_FALLBACK;
  }
}

/**
 * Main Chat function for Quranic Questions
 */
export async function askQuranQuestion(question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) return QURAN_ONLY_FALLBACK;

  try {
    const { data, error } = await supabase.functions.invoke("quran-chat", {
      body: { message: trimmed },
    });

    if (error) throw error;

    return data?.answer ?? QURAN_ONLY_FALLBACK;
  } catch (err) {
    console.error("Chat Error:", err);
    return QURAN_ONLY_FALLBACK;
  }
}
