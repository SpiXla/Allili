import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

export async function POST(req: NextRequest) {
  try {
    const { prompt, currentDate, dayOfWeek } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required in the request body." },
        { status: 400 }
      );
    }

    // Determine accurate current date
    const now = new Date();
    const todayStr =
      currentDate ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;
    const dayStr =
      dayOfWeek || now.toLocaleDateString("en-US", { weekday: "long" });

    const SYSTEM_PROMPT = `You are an automated API schedule generator.
Today's date is ${todayStr} (${dayStr}).

CRITICAL DATE & FORMAT RULES:
1. Output ONLY the raw JSON array string starting with [ and ending with ].
2. Every item MUST have:
   - "date": "YYYY-MM-DD"
   - "title": "string"
   - "start_time": "HH:MM" (24-hour format)
   - "duration_minutes": number
   - "category": "work" | "break" | "routine"
   - "advice": "short string"
3. DATE ANCHORING:
   - The primary schedule date MUST be today: "${todayStr}".
   - If tasks are spread across multiple days (e.g., today and tomorrow, or a 3-day plan), sequentially increment the date from "${todayStr}".
   - NEVER use past years (2023, 2024, etc.) or random dates.
4. Schema sample: [{"id": "uuid", "title": "Deep Work", "duration_minutes": 90, "date": "${todayStr}", "start_time": "09:00", "category": "work", "advice": "Focus block"}]
Do NOT think, do NOT write markdown explanations or notes. Output ONLY the raw JSON array.`;

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
        throw new Error(
          "Failed to parse valid JSON array from Gemma 4 output."
        );
      }
    }

    if (!Array.isArray(parsedData)) {
      throw new Error("Invalid response: expected a JSON array of tasks.");
    }

    // Post-process to guarantee every task has a valid current or future date
    interface RawTask {
      date?: string;
      [key: string]: unknown;
    }

    const todayYear = parseInt(todayStr.split("-")[0], 10);

    const validatedTasks = parsedData.map((task: RawTask) => {
      let taskDate = task.date;

      // If missing or has invalid format
      if (!taskDate || typeof taskDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(taskDate)) {
        taskDate = todayStr;
      } else {
        const [yearStr] = taskDate.split("-");
        const taskYear = parseInt(yearStr, 10);
        // If model output an old past year, replace year with current year
        if (taskYear < todayYear) {
          taskDate = `${todayYear}${taskDate.slice(4)}`;
        }
      }

      return {
        ...task,
        date: taskDate,
      };
    });

    return NextResponse.json(validatedTasks);
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
