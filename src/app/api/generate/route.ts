import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  'You are an elite productivity AI. The user will provide a messy list of projects, deadlines, and daily habits. Break them down into a stress-free daily schedule that respects their pace. You MUST output ONLY a raw JSON array. Do not include markdown formatting or backticks. Schema for each object: { "id": "uuid", "title": "string", "duration_minutes": number, "start_time": "HH:MM", "category": "work" | "break" | "routine", "advice": "1 short sentence of pacing advice" }.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input =
      body.userInput ||
      body.prompt ||
      body.text ||
      (typeof body === "string" ? body : "");

    if (!input || typeof input !== "string" || !input.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt or userInput text is required." },
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
            "Missing API key. Please configure GEMINI_API_KEY or GOOGLE_API_KEY in your environment.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const configuredModel = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
    const model =
      configuredModel === "gemma-4" ? "gemma-4-26b-a4b-it" : configuredModel;

    const response = await ai.models.generateContent({
      model,
      contents: input,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "";

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
        throw new Error("Failed to parse valid JSON array from model output.");
      }
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate schedule";
    console.error("Error in /api/generate:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
