import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


const SYSTEM_PROMPT = `You are a knowledgeable Islamic scholar and Quran learning assistant for the HIFZI app. You only answer questions about the Quran, tafsir, tajweed, hifz (memorization), Islamic history, and Quranic Arabic.

FORMATTING RULES — follow these exactly every time:

1. Start with one short introductory sentence (no bold, no number).

2. For each main point use this exact format:
   N. **Title:** Body text explaining the point clearly.

3. If quoting a Quranic verse use this format (on its own line):
   "Translation of the verse." (Surah Name, Chapter:Verse)

4. If quoting a hadith use:
   "Hadith text." (Source)

5. For sub-lists under a point, use:
   - Item text

6. Section headings (when grouping multiple numbered points) use:
   **Heading Text**

7. Keep responses concise — 3 to 5 numbered points maximum unless the question demands more detail.

8. Never use markdown headers (##), never use HTML, never use triple backticks.

9. End with a short encouraging closing sentence when appropriate.

IMPORTANT: If the question is not related to Quran, Islam, or hifz, politely decline and redirect.`;


function sanitizeSchema(schema: any) {
  if (!schema || typeof schema !== "object") {
    return { type: "OBJECT", properties: {} };
  }

  const clean: any = { type: "OBJECT", properties: {} };
  const props = schema.properties ?? {};

  for (const [key, value] of Object.entries(props)) {
    clean.properties[key] = {
      type: mapType((value as any)?.type),
      description: (value as any)?.description || "",
    };
  }

  return clean;
}

function mapType(type: string): string {
  switch ((type ?? "").toLowerCase()) {
    case "string":   return "STRING";
    case "number":
    case "integer":  return "NUMBER";
    case "boolean":  return "BOOLEAN";
    case "array":    return "ARRAY";
    case "object":   return "OBJECT";
    default:         return "STRING";
  }
}


function extractText(res: any): string {
  try {
    const parts = res?.candidates?.[0]?.content?.parts;
    const textPart = parts?.find((p: any) => p.text);
    return textPart?.text?.trim() || "No response generated.";
  } catch {
    return "Failed to parse AI response.";
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message } = body;

    const trimmed = (message || "").trim();
    if (!trimmed) {
      return new Response(
        JSON.stringify({ answer: "Please ask a Quran-related question." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    let mcpClient: Client | null = null;
    let mcpTools: any[] = [];

    try {
      const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.quran.ai/")
      );
      mcpClient = new Client(
        { name: "quran-app", version: "1.0.0" },
        { capabilities: {} }
      );
      await mcpClient.connect(transport);
      const toolsRes = await mcpClient.listTools();
      mcpTools = toolsRes.tools ?? [];
    } catch (err) {
      console.error("MCP connection failed (non-fatal):", err);
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      ...(mcpTools.length > 0 && {
        tools: [
          {
            functionDeclarations: mcpTools.map((t: any) => ({
              name: t.name,
              description: t.description ?? "",
              parameters: sanitizeSchema(t.inputSchema),
            })),
          },
        ],
      }),
    });

    const candidate = result.response?.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find(
      (p: any) => p.functionCall
    )?.functionCall;

    if (functionCall && mcpClient) {
      try {
        const toolResult = await mcpClient.callTool({
          name: functionCall.name,
          arguments: functionCall.args,
        });

        const finalResult = await model.generateContent({
          contents: [
            { role: "user", parts: [{ text: trimmed }] },
            { role: "model", parts: [{ functionCall }] },
            {
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: toolResult,
                  },
                },
              ],
            },
          ],
        });

        return new Response(
          JSON.stringify({ answer: extractText(finalResult.response) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("Tool execution failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ answer: extractText(result.response) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});