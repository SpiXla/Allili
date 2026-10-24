"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CalendarClock,
  Loader2,
  AlertCircle,
  X,
  RotateCcw,
  Layers,
  Zap,
  Wand2,
} from "lucide-react";
import { useScheduleStore, type Task } from "@/store/useScheduleStore";
import { TimelineSkeleton } from "@/components/TimelineSkeleton";
import { CalendarView } from "@/components/CalendarView";
import { ExportCalendarButton } from "@/components/ExportCalendarButton";

interface ApiTaskItem {
  id?: string;
  title?: string;
  duration_minutes?: number;
  duration?: number;
  date?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  category?: string;
  advice?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
}

const INSPIRATION_PROMPTS = [
  "1337 push_swap due tomorrow, gym for 2h, and 8h of sleep",
  "Weekly sprint: build Next.js auth, review PRs, 3x cardio sessions",
  "Exam cram on Friday: study algorithms 4h/day, morning routines",
];

function mapApiItemsToTasks(items: ApiTaskItem[]): Task[] {
  return items.map((item, index) => {
    const startTime = item.start_time || item.startTime || "09:00";
    const duration = Number(item.duration_minutes || item.duration || 30);

    let endTime = item.end_time || item.endTime;
    if (!endTime) {
      const [h, m] = startTime.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const total = h * 60 + m + duration;
        const endH = Math.floor(total / 60) % 24;
        const endM = total % 60;
        endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(
          2,
          "0"
        )}`;
      } else {
        endTime = startTime;
      }
    }

    let priority: "low" | "medium" | "high" = "medium";
    const cat = (item.category || "").toLowerCase();
    if (item.priority && ["low", "medium", "high"].includes(item.priority)) {
      priority = item.priority;
    } else if (cat === "work") {
      priority = "high";
    } else if (cat === "break") {
      priority = "low";
    } else {
      priority = "medium";
    }

    return {
      id:
        item.id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${index}-${Date.now()}`),
      title: item.title || "Untitled Task",
      description: item.advice || item.description || "",
      startTime,
      endTime,
      date: item.date,
      duration,
      priority,
      category: item.category || "routine",
      completed: false,
    };
  });
}

function formatErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    // Not a JSON string
  }
  return raw || fallback;
}

export default function Home() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const userInput = useScheduleStore((s) => s.userInput);
  const setUserInput = useScheduleStore((s) => s.setUserInput);
  const isLoading = useScheduleStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => (s + 1) % 3);
    }, 3200);
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "Synthesizing tasks with Gemma 4…",
    "Calibrating focus and rest blocks…",
    "Finalizing visual time grid…",
  ];
  const setIsLoading = useScheduleStore((s) => s.setIsLoading);
  const timelineData = useScheduleStore((s) => s.timelineData);
  const setTimelineData = useScheduleStore((s) => s.setTimelineData);
  const resetStore = useScheduleStore((s) => s.reset);

  const hasTimeline = timelineData.length > 0;
  const isEmpty = !isLoading && !hasTimeline;

  // Schedule statistics
  const stats = useMemo(() => {
    if (timelineData.length === 0) return null;
    const totalMinutes = timelineData.reduce(
      (acc, t) => acc + (t.duration || 0),
      0
    );
    const workMinutes = timelineData
      .filter((t) => t.category?.toLowerCase() === "work")
      .reduce((acc, t) => acc + (t.duration || 0), 0);
    const breakMinutes = timelineData
      .filter((t) => t.category?.toLowerCase() === "break")
      .reduce((acc, t) => acc + (t.duration || 0), 0);

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      workHours: (workMinutes / 60).toFixed(1),
      breakHours: (breakMinutes / 60).toFixed(1),
      totalTasks: timelineData.length,
      completedTasks: timelineData.filter((t) => t.completed).length,
    };
  }, [timelineData]);

  const handleOptimizePrompt = async () => {
    if (!userInput.trim() || isOptimizing || isLoading) return;

    setIsOptimizing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to optimize prompt.");
      }

      if (data.optimizedPrompt) {
        setPreviousPrompt(userInput);
        setUserInput(data.optimizedPrompt);
      }
    } catch (err: unknown) {
      setErrorMessage(
        formatErrorMessage(err, "Failed to optimize prompt with Gemma 4. Please try again.")
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRevertPrompt = () => {
    if (previousPrompt) {
      setUserInput(previousPrompt);
      setPreviousPrompt(null);
    }
  };

  const handleReset = () => {
    resetStore();
    setPreviousPrompt(null);
    setIsOptimizing(false);
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    if (!userInput.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate schedule.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected a task array.");
      }

      const tasks = mapApiItemsToTasks(data);
      setTimelineData(tasks);
    } catch (err: unknown) {
      setErrorMessage(
        formatErrorMessage(err, "An unexpected error occurred while generating your schedule.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#09090b] text-[#f4f4f5] antialiased">
      {/* ── Background subtle grid & ambient lighting ── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid-pattern opacity-60" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/[0.04] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-sky-500/[0.03] blur-[140px]" />
      </div>

      {/* ── Minimalist Top Navigation ── */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-8 h-14 border-b border-white/[0.07] bg-[#09090b]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
            Allili
            <span className="text-[10px] font-mono text-zinc-500 font-normal px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              AI Planner
            </span>
          </span>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {(hasTimeline || userInput.trim() || previousPrompt) && (
            <button
              onClick={handleReset}
              className="text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all"
              title="Reset prompt and schedule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {hasTimeline && <ExportCalendarButton />}

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gemma 4</span>
          </div>
        </div>
      </header>

      {/* ── Main Split View ── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ════════════════════════════════════════════════
            LEFT PANEL — Prompt Command Deck
           ════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-[420px] xl:w-[450px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.07] bg-[#0c0c10]/40 flex flex-col">
          <div className="p-6 lg:p-7 flex flex-col gap-5 flex-1">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400 font-semibold">
                  Brain Dump
                </span>

                {/* Prompt Optimization Action */}
                <div className="flex items-center gap-2">
                  {previousPrompt && (
                    <button
                      type="button"
                      onClick={handleRevertPrompt}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-violet-300 hover:text-violet-100 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all"
                      title="Revert to original unoptimized prompt"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Undo</span>
                    </button>
                  )}
                  {userInput.trim() && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline decoration-dotted transition-colors"
                      title="Clear prompt and reset"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={!userInput.trim() || isOptimizing || isLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
                               bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200
                               border border-violet-500/20 hover:border-violet-500/40
                               transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Optimize and structure prompt before scheduling"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                        <span>Optimizing…</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3 text-violet-400" />
                        <span>Optimize Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Plan your schedule
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Drop your messy thoughts, deadlines, or habits. The AI creates a
                stress-free calendar.
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-2.5 text-xs text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <p className="flex-1 leading-relaxed">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-400 hover:text-rose-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Minimalist Input Box ── */}
            <div className="flex-1 flex flex-col rounded-2xl bg-[#121218] border border-white/[0.08] focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/15 transition-all min-h-[220px]">
              <textarea
                ref={textareaRef}
                id="brain-dump-input"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  if (previousPrompt) setPreviousPrompt(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Write your day or week here: e.g. Finish push_swap project by tomorrow 2pm, hit the gym for 2 hours, get 8 hours of sleep…"
                className="flex-1 w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-500 text-xs leading-relaxed p-4 focus:outline-none scrollbar-thin"
                disabled={isLoading || isOptimizing}
              />

              {/* Character & Shortcut Counter */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04] text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>
                    {userInput.length > 0
                      ? `${userInput.length} chars`
                      : "Empty"}
                  </span>
                  {previousPrompt && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-violet-400 flex items-center gap-1 font-sans">
                        <Sparkles className="w-3 h-3" />
                        Optimized
                      </span>
                      <button
                        type="button"
                        onClick={handleRevertPrompt}
                        className="text-zinc-500 hover:text-zinc-300 underline decoration-dotted transition-colors"
                      >
                        (undo)
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-zinc-600">⌘ + Enter to run</span>
              </div>
            </div>

            {/* Quick Inspiration Prompts */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                Quick Prompts
              </span>
              <div className="flex flex-col gap-1.5">
                {INSPIRATION_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => setUserInput(promptText)}
                    disabled={isLoading}
                    className="text-left text-[11px] text-zinc-400 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] px-3 py-1.5 rounded-lg transition-all truncate"
                  >
                    &ldquo;{promptText}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* ── Generate Action Button ── */}
            <button
              id="generate-schedule-btn"
              onClick={handleGenerate}
              disabled={!userInput.trim() || isLoading}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-violet-400" />
                  <span className="text-zinc-200 transition-all duration-300">
                    {loadingMessages[loadingStep]}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 mr-2" />
                  Generate Schedule
                </>
              )}
            </button>

            {/* Schedule stats mini card (when loaded) */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] grid grid-cols-3 gap-2 text-center"
              >
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                    Planned
                  </span>
                  <span className="text-sm font-semibold text-zinc-200 font-mono">
                    {stats.totalHours}h
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                    Deep Work
                  </span>
                  <span className="text-sm font-semibold text-violet-400 font-mono">
                    {stats.workHours}h
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                    Breaks
                  </span>
                  <span className="text-sm font-semibold text-emerald-400 font-mono">
                    {stats.breakHours}h
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════════
            RIGHT PANEL — Visual Calendar Grid
           ════════════════════════════════════════════════ */}
        <section className="flex-1 flex flex-col min-h-0 bg-[#09090b]">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 lg:px-8 py-3.5 border-b border-white/[0.07] bg-[#0c0c10]/30">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Visual Schedule
              </h2>
            </div>

            {hasTimeline && (
              <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.06]">
                {timelineData.length} tasks scheduled
              </span>
            )}
          </div>

          {/* Canvas content */}
          <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
            {/* Loading state */}
            {isLoading && <TimelineSkeleton />}

            {/* Calendar view */}
            {!isLoading && hasTimeline && <CalendarView />}

            {/* Modern Minimalist Empty State */}
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-white/[0.06] bg-white/[0.01]"
              >
                {/* Minimal geometric graphic */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#121218] border border-white/[0.08] flex items-center justify-center shadow-2xl">
                    <Layers className="w-6 h-6 text-zinc-500" />
                  </div>
                  {/* Concentric subtle orbit */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 25,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-2.5 rounded-2xl border border-dashed border-violet-500/25 pointer-events-none"
                  />
                </div>

                <h3 className="text-sm font-semibold text-zinc-200 mb-1 tracking-tight">
                  No schedule generated yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mb-5 leading-relaxed">
                  Enter your commitments in the prompt deck, or click any prompt
                  preset on the left to start.
                </p>

                <button
                  onClick={() =>
                    setUserInput(
                      "1337 push_swap due tomorrow, gym for 2h, and 8h of sleep"
                    )
                  }
                  className="btn-secondary text-[11px]"
                >
                  <Sparkles className="w-3 h-3 text-violet-400 mr-1.5" />
                  Load Sample Prompt
                </button>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
