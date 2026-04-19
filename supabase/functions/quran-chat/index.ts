import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --------------------------------------------------
// 🔧 SAFE SCHEMA CONVERTER (FIX FOR GEMINI ERROR)
// --------------------------------------------------
function sanitizeSchema(schema: any) {
  if (!schema || typeof schema !== "object") {
    return { type: "OBJECT", properties: {} };
  }

  const clean: any = {
    type: "OBJECT",
    properties: {},
  };

  const props = schema.properties ?? {};

  for (const [key, value] of Object.entries(props)) {
    clean.properties[key] = {
      type: mapType((value as any)?.type),
      description: (value as any)?.description || "",
    };
  }

  return clean;
}

// Gemini expects uppercase primitive types
function mapType(type: string) {
  if (!type) return "STRING";

  const t = type.toLowerCase();

  switch (t) {
    case "string":
      return "STRING";
    case "number":
    case "integer":
      return "NUMBER";
    case "boolean":
      return "BOOLEAN";
    case "array":
      return "ARRAY";
    case "object":
      return "OBJECT";
    default:
      return "STRING";
  }
}

// --------------------------------------------------
// 🧠 SAFE TEXT EXTRACTION
// --------------------------------------------------
function extractText(res: any): string {
  try {
    const parts = res?.candidates?.[0]?.content?.parts;
    const textPart = parts?.find((p: any) => p.text);
    return textPart?.text || "No response generated.";
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

    console.log("📩 Incoming request:", body);

    const trimmed = (message || "").trim();

    if (!trimmed) {
      return new Response(
        JSON.stringify({ answer: "Please ask a Quran-related question." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------
    // 🤖 GEMINI SETUP
    // --------------------------------------------------
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are a Quranic assistant. Only answer Quran-related questions. Keep answers clear and grounded.",
    });

    // --------------------------------------------------
    // 🔌 MCP SETUP
    // --------------------------------------------------
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

      console.log("🧩 MCP tools loaded:", mcpTools.length);
    } catch (err) {
      console.error("⚠️ MCP connection failed:", err);
    }

    // --------------------------------------------------
    // 🧠 GEMINI TOOL CALL
    // --------------------------------------------------
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: trimmed }],
        },
      ],

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

    // --------------------------------------------------
    // 🔧 TOOL EXECUTION
    // --------------------------------------------------
    if (functionCall && mcpClient) {
      try {
        console.log("🔧 Tool called:", functionCall.name);

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
          JSON.stringify({
            answer: extractText(finalResult.response),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        console.error("❌ Tool execution failed:", err);
      }
    }

    // --------------------------------------------------
    // 🧾 NORMAL RESPONSE
    // --------------------------------------------------
    return new Response(
      JSON.stringify({
        answer: extractText(result.response),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("🔥 FULL ERROR:", error);

    return new Response(
      JSON.stringify({
        error: error?.message ?? "Unknown error",
        stack: error?.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});