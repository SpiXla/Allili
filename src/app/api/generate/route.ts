import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

const SYSTEM_PROMPT =
  'You are an elite productivity AI. The user will provide a messy list of projects, deadlines, and habits. Analyze the scope of the tasks and deadlines to intelligently determine whether a single-day or multi-day weekly schedule is more appropriate. Break the tasks down into a stress-free schedule spanning that inferred timeframe. You MUST output ONLY a raw JSON array. Schema: { "id": "uuid", "title": "string", "duration_minutes": number, "date": "YYYY-MM-DD", "start_time": "HH:MM", "category": "work" | "break" | "routine", "advice": "short string" }.';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required in the request body." },
        { status: 400 }
      );
    }

    const preferredModel = process.env.GEMMA_MODEL || "gemma-4-31b-it";

    const rawText = await generateWithGemma({
      contents: prompt,
      systemInstruction: SYSTEM_PROMPT,
      jsonMode: true,
      preferredModel,
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
      // Fallback: attempt to find JSON array brackets if model prepended/appended text
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
