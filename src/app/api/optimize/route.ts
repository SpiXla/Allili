import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

const OPTIMIZE_SYSTEM_PROMPT =
  "You are an automated prompt enhancer. Do NOT think, do NOT write analysis, bullet reasoning, or explanations. Rewrite the user's messy tasks into a clear, direct, structured prompt under 90 words with realistic duration estimates and logical flow. Output ONLY the raw enhanced prompt string directly.";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required to optimize." },
        { status: 400 }
      );
    }

    const preferredModel = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

    const rawText = await generateWithGemma({
      contents: prompt,
      systemInstruction: OPTIMIZE_SYSTEM_PROMPT,
      preferredModel,
      maxOutputTokens: 600,
    });

    let optimizedPrompt = rawText.trim();

    // Clean any accidental markdown code fences or quotes
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

    return NextResponse.json({ optimizedPrompt });
  } catch (error: unknown) {
    let message = "Failed to optimize prompt with Gemma 4.";
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message);
        message = parsed?.error?.message || error.message;
      } catch {
        message = error.message;
      }
    }
    console.error("Error in /api/optimize:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
