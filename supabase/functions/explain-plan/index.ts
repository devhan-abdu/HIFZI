import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

serve(async (req) => {
  try {
    const { summary, suggestion } = await req.json();

   const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                 text: `
You are a Quran memorization coach.

STRICT RULES:
- Do NOT change the plan
- Do NOT add new suggestions
- ONLY explain the provided plan
- ONLY use the given data

User progress:
${JSON.stringify(summary)}

Suggested plan:
${JSON.stringify(suggestion)}

Explain clearly and motivate the user.
`,
                },
              ],
            },
          ],
        }),
      }
    );
console.log("STATUS:", res.status);
    const data = await res.json();

console.log("GEMINI RAW RESPONSE:", JSON.stringify(data, null, 2));

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Stay consistent and keep going!";

    return new Response(JSON.stringify({ answer: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});