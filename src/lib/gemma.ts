import { GoogleGenAI } from "@google/genai";

// Strictly Gemma 4 models only
export const GEMMA_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
] as const;

export type GemmaModel = (typeof GEMMA_MODELS)[number];

interface GemmaGenerateOptions {
  contents: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  preferredModel?: string;
}

/**
 * Resiliently generates content using Gemma 4 with automatic retries and fallback
 * between Gemma 4 models when Google's API returns transient 500 Internal Errors.
 */
export async function generateWithGemma(options: GemmaGenerateOptions): Promise<string> {
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

  // Resolve user preferred model or default to flagship gemma-4-31b-it
  let primaryModel: string = "gemma-4-31b-it";
  if (options.preferredModel) {
    if (options.preferredModel === "gemma-4" || options.preferredModel === "gemma-4-31b-it") {
      primaryModel = "gemma-4-31b-it";
    } else if (options.preferredModel === "gemma-4-26b-a4b-it") {
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
    // Try up to 2 attempts per Gemma 4 model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: {
          systemInstruction?: string;
          responseMimeType?: string;
        } = {};

        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        if (options.jsonMode) {
          config.responseMimeType = "application/json";
        }

        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config,
        });

        const text = response.text || "";
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string; status?: number; code?: number };
        const msg = errorObj?.message || String(err);
        lastError = err instanceof Error ? err : new Error(msg);

        const isTransient =
          msg.includes("500") ||
          msg.includes("INTERNAL") ||
          msg.includes("Internal error") ||
          msg.includes("503") ||
          msg.includes("quota") ||
          errorObj?.status === 500;

        console.warn(
          `[Gemma 4] Model ${model} attempt ${attempt} encountered error: ${msg}. Transient: ${isTransient}`
        );

        if (!isTransient && attempt === 2) {
          break;
        }

        // Wait with brief exponential backoff before retrying
        await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
      }
    }
  }

  throw (
    lastError ||
    new Error("Failed to generate response from Gemma 4 after multiple attempts.")
  );
}
