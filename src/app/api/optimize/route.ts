import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const OPTIMIZE_SYSTEM_PROMPT =
  "You are an expert prompt engineer and executive productivity coach. The user provides a raw, messy list of upcoming tasks, deadlines, and habits. Your task is to rewrite and optimize their prompt into a rich, structured, and comprehensive brain dump. Clarify vague goals, add realistic duration estimates where missing, organize logical flow, and specify pacing or breaks while preserving every task the user mentioned. Output ONLY the optimized prompt text directly. Do not include markdown headers, bullet lists with explanations, conversational filler, or introductory phrases.";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required to optimize." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing API key. Please configure GEMINI_API_KEY in your environment.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use fast flash model for rapid prompt enhancement, or configured override
    const model =
      process.env.OPTIMIZE_MODEL ||
      (process.env.GEMMA_MODEL === "gemma-4"
        ? "gemini-2.5-flash"
        : process.env.GEMMA_MODEL) ||
      "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: OPTIMIZE_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const rawText = response.text?.trim() || "";

    // Clean any accidental markdown code fences or quotes
    let optimizedPrompt = rawText;
    if (optimizedPrompt.startsWith("```")) {
      optimizedPrompt = optimizedPrompt
        .replace(/^```[a-z]*\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }
    if (
      optimizedPrompt.startsWith('"') &&
      optimizedPrompt.endsWith('"') &&
      optimizedPrompt.length > 2
    ) {
      optimizedPrompt = optimizedPrompt.slice(1, -1).trim();
    }

    return NextResponse.json({
      originalPrompt: prompt,
      optimizedPrompt: optimizedPrompt || prompt,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to optimize prompt.";
    console.error("Error in /api/optimize:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
