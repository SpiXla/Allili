import { NextRequest, NextResponse } from "next/server";
import { generateWithGemma } from "@/lib/gemma";

export async function POST(req: NextRequest) {
  try {
    const { prompt, preferences, currentDate, dayOfWeek } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A non-empty prompt is required to optimize." },
        { status: 400 }
      );
    }

    // Determine current reference date
    const now = new Date();
    const todayStr =
      currentDate ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;
    const dayStr =
      dayOfWeek || now.toLocaleDateString("en-US", { weekday: "long" });

    // 1. Priority Strategy Instruction
    let priorityStrategy = "Balance work and health evenly.";
    if (preferences?.priorityFocus === "deep-work") {
      priorityStrategy =
        "PRIORITIZE HIGH-IMPACT WORK & HARD DEADLINES FIRST: Place critical tasks during peak focus hours. Break large projects into concrete sequential execution blocks with high priority tags.";
    } else if (preferences?.priorityFocus === "wellness") {
      priorityStrategy =
        "PRIORITIZE HEALTH & SUSTAINABILITY: Secure workout/gym, mental recovery, mindful meals, and 8 hours of sleep as non-negotiable anchors before scheduling work.";
    } else if (preferences?.priorityFocus === "balanced") {
      priorityStrategy =
        "BALANCED RHYTHM: Distribute work sessions evenly with frequent restorative breaks and healthy habits.";
    }

    // 2. Daily Habits & Routines Instruction
    const dailyHabits: string[] = [];
    if (preferences?.includeMorningRoutine ?? true) {
      dailyHabits.push(
        "Morning routine, hydration, and healthy breakfast (45-60 min, typically around 07:30 - 08:30)"
      );
    }
    if (preferences?.includeMeals ?? true) {
      dailyHabits.push(
        "Dedicated lunch break (45-60 min around 12:30 - 13:30) and dinner (around 19:30 - 20:30)"
      );
    }
    if (preferences?.includeWorkout ?? true) {
      dailyHabits.push(
        "Physical workout / gym / cardio session (60-120 min scheduled at an optimal energy time)"
      );
    }
    if (preferences?.includeSleep ?? true) {
      dailyHabits.push(
        "Evening wind-down & 8 hours of uninterrupted sleep (typically 23:00 - 07:00)"
      );
    }
    if (preferences?.includeBuffers ?? true) {
      dailyHabits.push(
        "15-minute buffer breaks between intense work sprints for mental reset"
      );
    }

    // 3. Peak Focus Window
    let focusWindow = "Energy peak: Morning hours (09:00 - 13:00).";
    if (preferences?.focusWindow === "afternoon") {
      focusWindow =
        "Energy peak: Afternoon / Evening hours (14:00 - 19:00).";
    } else if (preferences?.focusWindow === "flexible") {
      focusWindow = "Energy peak: Flexible throughout the day.";
    }

    // 4. Custom Constraints
    const customNotes = preferences?.customNotes?.trim()
      ? `User custom constraint/note: "${preferences.customNotes.trim()}"`
      : "";

    const OPTIMIZE_SYSTEM_PROMPT = `You are an elite schedule architect and personal productivity planner.
Today is ${todayStr} (${dayStr}).

Your mission: Transform the user's messy prompt into a comprehensive, complete, and prioritized schedule prompt that weaves together their core tasks, daily habits, and priority preferences.

MANDATORY GUIDELINES:
1. DAILY HABITS INCLUSION:
You MUST integrate the following daily routines into the schedule:
${dailyHabits.map((h) => `- ${h}`).join("\n")}

2. TASK PRIORITY & PACING:
- ${priorityStrategy}
- ${focusWindow}
${customNotes ? `- ${customNotes}` : ""}

3. DATE AWARENESS:
Today's date is ${todayStr} (${dayStr}). If the prompt mentions deadlines like "due tomorrow" or multi-day sprints, explicitly organize the schedule chronologically across today (${todayStr}) and tomorrow, indicating exact days.

4. OUTPUT FORMAT:
Output a structured, highly legible agenda with chronological time ranges, task titles, priority badges ([HIGH PRIORITY], [ROUTINE], [BREAK]), and brief descriptions.
Do NOT output thinking, analysis, markdown code blocks, or polite conversational filler. Output ONLY the optimized schedule prompt text directly.`;

    const preferredModel = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

    const rawText = await generateWithGemma({
      contents: `User's raw thoughts:\n"${prompt}"\n\nPlease create the comprehensive, prioritized schedule prompt incorporating all daily habits and priorities for ${todayStr}.`,
      systemInstruction: OPTIMIZE_SYSTEM_PROMPT,
      preferredModel,
      maxOutputTokens: 900,
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

    return NextResponse.json({
      optimizedPrompt,
      currentDate: todayStr,
    });
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
