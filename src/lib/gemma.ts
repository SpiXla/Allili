import { GoogleGenAI } from "@google/genai";

// Strictly Gemma 4 models only
// 26b-a4b-it is the high-efficiency MoE model (much faster latency, no 503 demand queues)
export const GEMMA_MODELS = [
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
] as const;

export type GemmaModel = (typeof GEMMA_MODELS)[number];

interface GemmaGenerateOptions {
  contents: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  preferredModel?: string;
  maxOutputTokens?: number;
}

/**
 * Resiliently and swiftly generates content using Gemma 4 with low latency,
 * candidate part extraction, and fast fallback between Gemma 4 models.
 */
export async function generateWithGemma(
  options: GemmaGenerateOptions
): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing API key. Please configure GEMINI_API_KEY or GOOGLE_API_KEY in your environment."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Default to the fast 26b-a4b-it Gemma 4 model for rapid response times
  let primaryModel: string = "gemma-4-26b-a4b-it";
  if (options.preferredModel) {
    if (options.preferredModel === "gemma-4-31b-it") {
      primaryModel = "gemma-4-31b-it";
    } else if (
      options.preferredModel === "gemma-4" ||
      options.preferredModel === "gemma-4-26b-a4b-it"
    ) {
      primaryModel = "gemma-4-26b-a4b-it";
    }
  }

  // Construct fallback chain consisting solely of Gemma 4 models
  const candidateModels = [
    primaryModel,
    ...GEMMA_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    // Try each Gemma 4 model with fail-fast recovery
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: {
          systemInstruction?: string;
          responseMimeType?: string;
          maxOutputTokens?: number;
        } = {};

        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        if (options.jsonMode) {
          config.responseMimeType = "application/json";
        }

        // Default to 8192 tokens so thought tokens never exhaust the output quota
        config.maxOutputTokens = options.maxOutputTokens || 8192;

        // 90s timeout to allow full generation of multi-day agendas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        let response;
        try {
          response = await ai.models.generateContent({
            model,
            contents: options.contents,
            config,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        // Extract text from non-thought parts (joins all candidate parts)
        let text = "";
        if (response.candidates?.[0]?.content?.parts) {
          const parts = response.candidates[0].content.parts;
          const nonThought = parts.filter((p) => !p.thought);
          if (nonThought.length > 0) {
            text = nonThought.map((p) => p.text || "").join("");
          } else {
            text = parts[parts.length - 1]?.text || "";
          }
        }

        if (!text) {
          text = response.text || "";
        }

        text = text.trim();
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        const errorObj = err as {
          message?: string;
          status?: number;
          code?: number;
        };
        const msg = errorObj?.message || String(err);
        lastError = err instanceof Error ? err : new Error(msg);

        const isTransient =
          msg.includes("500") ||
          msg.includes("INTERNAL") ||
          msg.includes("Internal error") ||
          msg.includes("503") ||
          msg.includes("quota") ||
          msg.includes("aborted") ||
          errorObj?.status === 500;

        console.warn(
          `[Gemma 4 Speed Optimizer] Model ${model} attempt ${attempt} warning: ${msg}`
        );

        // On 503 high demand or timeout, immediately failover to next candidate without waiting
        if (msg.includes("503") || msg.includes("aborted")) {
          break;
        }

        if (!isTransient && attempt === 2) {
          break;
        }

        // Very brief backoff (400ms) to ensure near-instant retry
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "Gemma 4 inference failed across all model attempts. Please verify your API key."
    )
  );
}
