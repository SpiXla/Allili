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
  Cpu,
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
  {
    tag: "42 Cursus",
    color: "from-indigo-500/20 to-purple-500/10 text-indigo-300 border-indigo-500/30",
    dot: "bg-indigo-400",
    text: "1337 push_swap due tomorrow, gym for 2h, and 8h of sleep",
  },
  {
    tag: "Sprint",
    color: "from-cyan-500/20 to-blue-500/10 text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-400",
    text: "Weekly sprint: build Next.js auth, review PRs, 3x cardio sessions",
  },
  {
    tag: "Exam",
    color: "from-amber-500/20 to-rose-500/10 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    text: "Exam cram on Friday: study algorithms 4h/day, morning routines",
  },
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
  const setIsLoading = useScheduleStore((s) => s.setIsLoading);
  const timelineData = useScheduleStore((s) => s.timelineData);
  const setTimelineData = useScheduleStore((s) => s.setTimelineData);
  const resetStore = useScheduleStore((s) => s.reset);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => (s + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "Synthesizing tasks with Gemma 4…",
    "Calibrating focus and rest blocks…",
    "Finalizing visual time grid…",
  ];

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
        formatErrorMessage(
          err,
          "Failed to optimize prompt with Gemma 4. Please try again."
        )
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
        formatErrorMessage(
          err,
          "An unexpected error occurred while generating your schedule."
        )
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
    <div className="relative min-h-screen flex flex-col bg-[#06070a] text-[#f4f6fc] antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ── Cyber-Luxe Ambient Aurora Lighting ── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] rounded-full bg-indigo-600/[0.06] blur-[150px]" />
        <div className="absolute top-1/3 right-10 w-[550px] h-[550px] rounded-full bg-purple-600/[0.05] blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-pink-500/[0.035] blur-[140px]" />
      </div>

      {/* ── Modernist Obsidian Top Navigation ── */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-8 h-15 border-b border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">
              Allili
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-indigo-300 font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Cyber-Luxe
            </span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {(hasTimeline || userInput.trim() || previousPrompt) && (
            <button
              onClick={handleReset}
              className="text-zinc-400 hover:text-zinc-100 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all"
              title="Reset prompt and schedule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {hasTimeline && <ExportCalendarButton />}

          {/* Engine indicator */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-300 bg-[#0d111d] px-3 py-1.5 rounded-lg border border-white/[0.08] shadow-inner">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="font-medium text-zinc-200">Gemma 4</span>
          </div>
        </div>
      </header>

      {/* ── Main Split View ── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ════════════════════════════════════════════════
            LEFT PANEL — Prompt Command Deck
           ════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-[430px] xl:w-[460px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#07090f]/70 backdrop-blur-2xl flex flex-col">
          <div className="p-6 lg:p-7 flex flex-col gap-5 flex-1">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                  Prompt Command Deck
                </span>

                {/* Prompt Optimization Action */}
                <div className="flex items-center gap-2">
                  {previousPrompt && (
                    <button
                      type="button"
                      onClick={handleRevertPrompt}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all shadow-sm"
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
                    className="btn-optimize disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Optimize and structure prompt before scheduling"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Refining…</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Optimize Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Draft your agenda
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Drop your raw thoughts, deadlines, and habits. Gemma 4 will
                calibrate a high-performance visual schedule.
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-2.5 text-xs text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
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

            {/* ── Futuristic Obsidian Input Box ── */}
            <div className="flex-1 flex flex-col rounded-2xl bg-[#0c101a]/90 border border-white/[0.09] focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all min-h-[220px] shadow-2xl">
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
                className="flex-1 w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-600 text-xs leading-relaxed p-4 focus:outline-none scrollbar-thin font-sans"
                disabled={isLoading || isOptimizing}
              />

              {/* Character & Shortcut Counter */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] bg-white/[0.01] text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-2">
                  <span>
                    {userInput.length > 0
                      ? `${userInput.length} chars`
                      : "Empty"}
                  </span>
                  {previousPrompt && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-indigo-300 flex items-center gap-1 font-sans text-[10px] font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        Optimized
                      </span>
                      <button
                        type="button"
                        onClick={handleRevertPrompt}
                        className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted transition-colors text-[10px]"
                      >
                        undo
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-zinc-600 font-mono text-[10px]">
                  ⌘ / Ctrl + Enter
                </span>
              </div>
            </div>

            {/* Quick Inspiration Prompts with category badges */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-2.5 block">
                Quick Prompts
              </span>
              <div className="flex flex-col gap-2">
                {INSPIRATION_PROMPTS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setUserInput(item.text)}
                    disabled={isLoading}
                    className="text-left group flex items-center gap-2.5 text-[11px] text-zinc-300 hover:text-white bg-[#0e1320]/80 hover:bg-[#13192b] border border-white/[0.06] hover:border-indigo-500/30 px-3 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border ${item.color} flex items-center gap-1 flex-shrink-0`}
                    >
                      <span className={`w-1 h-1 rounded-full ${item.dot}`} />
                      {item.tag}
                    </span>
                    <span className="truncate group-hover:text-zinc-100 transition-colors">
                      {item.text}
                    </span>
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-200" />
                  <span className="text-white font-medium transition-all duration-300">
                    {loadingMessages[loadingStep]}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-pink-200 fill-pink-200" />
                  <span>Generate Schedule</span>
                </>
              )}
            </button>

            {/* Schedule stats mini card (when loaded) */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-[#0d1220]/90 border border-white/[0.08] grid grid-cols-3 gap-2 text-center shadow-lg backdrop-blur-md"
              >
                <div className="border-r border-white/[0.06] pr-2">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">
                    Planned
                  </span>
                  <span className="text-sm font-semibold text-sky-400 font-mono">
                    {stats.totalHours}h
                  </span>
                </div>
                <div className="border-r border-white/[0.06] px-2">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">
                    Deep Work
                  </span>
                  <span className="text-sm font-semibold text-indigo-400 font-mono">
                    {stats.workHours}h
                  </span>
                </div>
                <div className="pl-2">
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase tracking-wider">
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
        <section className="flex-1 flex flex-col min-h-0 bg-[#06070a]">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 lg:px-8 py-3.5 border-b border-white/[0.08] bg-[#080b12]/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Visual Schedule Matrix
              </h2>
            </div>

            {hasTimeline && (
              <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 font-medium">
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

            {/* Cyber-Luxe Obsidian Empty State */}
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-white/[0.07] bg-[#080b12]/50 backdrop-blur-xl relative overflow-hidden"
              >
                {/* Minimal geometric graphic */}
                <div className="relative mb-6">
                  <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#111728] to-[#0c0f1a] border border-white/[0.1] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                    <Layers className="w-7 h-7 text-indigo-400" />
                  </div>
                  {/* Concentric rotating orbital ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 30,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-3 rounded-2xl border border-dashed border-indigo-500/30 pointer-events-none"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 45,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-6 rounded-3xl border border-dotted border-purple-500/20 pointer-events-none"
                  />
                </div>

                <h3 className="text-base font-bold text-white mb-1.5 tracking-tight">
                  No schedule generated yet
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                  Enter your commitments, study sprints, or workouts in the
                  command deck on the left to synthesize a responsive time matrix.
                </p>

                <button
                  onClick={() =>
                    setUserInput(
                      "1337 push_swap due tomorrow, gym for 2h, and 8h of sleep"
                    )
                  }
                  className="btn-secondary text-xs group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 mr-2 group-hover:rotate-12 transition-transform" />
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
