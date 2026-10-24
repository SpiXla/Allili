import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

/**
 * Robust JSON array extractor and truncation repair.
 * If output was truncated by token limit, it salvages all complete objects
 * up to the last closing brace and appends the closing bracket.
 */
function parseRobustJsonArray(rawText: string): unknown[] {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  // 1. Direct standard parse
  try {
    const data = JSON.parse(cleaned);
    if (Array.isArray(data)) return data;
  } catch {
    // continue
  }

  // 2. Regex bracket match
  const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const data = JSON.parse(arrayMatch[0]);
      if (Array.isArray(data)) return data;
    } catch {
      // continue
    }
  }

  // 3. Salvage truncated JSON array: find the opening [ and the last valid complete object }
  const firstBracket = cleaned.indexOf("[");
  if (firstBracket !== -1) {
    const fromBracket = cleaned.slice(firstBracket);
    const lastBrace = fromBracket.lastIndexOf("}");
    if (lastBrace !== -1) {
      const repaired = fromBracket.slice(0, lastBrace + 1) + "\n]";
      try {
        const data = JSON.parse(repaired);
        if (Array.isArray(data) && data.length > 0) {
          console.log(
            `[JSON Repair] Successfully salvaged ${data.length} tasks from partial model output.`
          );
          return data;
        }
      } catch (err) {
        console.warn("[JSON Repair] Salvage attempt failed:", err);
      }
    }
  }

  throw new Error("Failed to parse valid JSON array from Gemma 4 output.");
}

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

CRITICAL INSTRUCTIONS:
1. Convert the user's agenda directly into a raw JSON array.
2. Every item MUST have:
   - "date": "YYYY-MM-DD"
   - "title": "string"
   - "start_time": "HH:MM" (24-hour format)
   - "duration_minutes": number
   - "category": "work" | "break" | "routine"
   - "advice": "short string"
3. DATE ANCHORING:
   - Primary date is "${todayStr}".
   - If tasks are spread across today and tomorrow, increment the date sequentially starting from "${todayStr}".
   - NEVER use past years (2023, 2024, etc.).
4. Do NOT output markdown explanations, thoughts, or text. Output ONLY the JSON array starting with [ and ending with ].`;

    const preferredModel = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

    const rawText = await generateWithGemma({
      contents: prompt,
      systemInstruction: SYSTEM_PROMPT,
      jsonMode: true,
      preferredModel,
      maxOutputTokens: 8192,
    });

    const parsedData = parseRobustJsonArray(rawText);

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error("Invalid response: expected a non-empty task array.");
    }

    // Post-process to guarantee every task has a valid current or future date
    interface RawTask {
      date?: string;
      [key: string]: unknown;
    }

    const todayYear = parseInt(todayStr.split("-")[0], 10);

    const validatedTasks = parsedData.map((task: unknown) => {
      const t = task as RawTask;
      let taskDate = t.date;

      // If missing or has invalid format
      if (
        !taskDate ||
        typeof taskDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(taskDate)
      ) {
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
        ...t,
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
