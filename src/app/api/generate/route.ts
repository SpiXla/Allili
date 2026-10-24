import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

const SYSTEM_PROMPT =
  'You are an automated API schedule generator. Do NOT think, do NOT write notes, thoughts, or analysis. Intelligently determine whether a single-day or multi-day schedule is appropriate based on task scope. Output ONLY the raw JSON array string starting with [ and ending with ]. Schema: [{"id": "uuid", "title": "string", "duration_minutes": number, "date": "YYYY-MM-DD", "start_time": "HH:MM", "category": "work" | "break" | "routine", "advice": "short string"}].';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required in the request body." },
        { status: 400 }
      );
    }

    const preferredModel = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

    const rawText = await generateWithGemma({
      contents: prompt,
      systemInstruction: SYSTEM_PROMPT,
      jsonMode: true,
      preferredModel,
      maxOutputTokens: 2048,
    });

    // Parse the JSON array, cleaning any potential markdown code fences
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch {
      // Fallback: extract JSON array brackets if model prepended/appended text
      const arrayMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        parsedData = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Failed to parse valid JSON array from Gemma 4 output.");
      }
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    let message = "Failed to generate schedule";
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message);
        message = parsed?.error?.message || error.message;
      } catch {
        message = error.message;
      }
    }
    console.error("Error in /api/generate:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
