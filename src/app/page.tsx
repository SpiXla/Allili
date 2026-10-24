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
  Calendar as CalendarIcon,
  Check,
  Sunrise,
  Utensils,
  Dumbbell,
  Moon,
  Coffee,
  SlidersHorizontal,
} from "lucide-react";
import {
  useScheduleStore,
  type Task,
  type UserPreferences,
} from "@/store/useScheduleStore";
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

function mapApiItemsToTasks(
  items: ApiTaskItem[],
  defaultDate: string
): Task[] {
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
      date: item.date || defaultDate,
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
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const userInput = useScheduleStore((s) => s.userInput);
  const setUserInput = useScheduleStore((s) => s.setUserInput);
  const isLoading = useScheduleStore((s) => s.isLoading);
  const setIsLoading = useScheduleStore((s) => s.setIsLoading);
  const timelineData = useScheduleStore((s) => s.timelineData);
  const setTimelineData = useScheduleStore((s) => s.setTimelineData);
  const preferences = useScheduleStore((s) => s.preferences);
  const setPreferences = useScheduleStore((s) => s.setPreferences);
  const resetStore = useScheduleStore((s) => s.reset);

  // Local state for the optimization preferences form inside the modal
  const [formPrefs, setFormPrefs] = useState<UserPreferences>(preferences);

  // Sync store preferences into form when modal opens
  useEffect(() => {
    if (showOptimizeModal) {
      setFormPrefs(preferences);
    }
  }, [showOptimizeModal, preferences]);

  // Current date info based on user's real local time
  const { currentDate, dayOfWeek, formattedToday } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return {
      currentDate: `${y}-${m}-${d}`,
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      formattedToday: now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  }, []);

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

  // Handle clicking the "Optimize Prompt" button: Ask user for preferences via modal
  const handleOpenOptimizeModal = () => {
    if (!userInput.trim()) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }
    setShowOptimizeModal(true);
  };

  // Submit preferences and execute prompt optimization
  const handleExecuteOptimization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isOptimizing || isLoading) return;

    // Save preferences in global store so they persist
    setPreferences(formPrefs);
    setIsOptimizing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          preferences: formPrefs,
          currentDate,
          dayOfWeek,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to optimize prompt.");
      }

      if (data.optimizedPrompt) {
        setPreviousPrompt(userInput);
        setUserInput(data.optimizedPrompt);
        setShowOptimizeModal(false);
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
    setShowOptimizeModal(false);
  };

  const handleGenerate = async () => {
    if (!userInput.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          currentDate,
          dayOfWeek,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate schedule.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected a task array.");
      }

      const tasks = mapApiItemsToTasks(data, currentDate);
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
            <span className="text-[11px] font-semibold tracking-wide uppercase text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Cyber-Luxe
            </span>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          {/* Current Date Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.07]">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-zinc-300">{formattedToday}</span>
          </div>

          {(hasTimeline || userInput.trim() || previousPrompt) && (
            <button
              onClick={handleReset}
              className="text-zinc-400 hover:text-zinc-100 text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all"
              title="Reset prompt and schedule"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {hasTimeline && <ExportCalendarButton />}

          {/* Engine indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-300 bg-[#0d111d] px-3 py-1.5 rounded-lg border border-white/[0.08] shadow-inner">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="font-semibold text-zinc-200">Gemma 4</span>
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
                <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                  Prompt Command Deck
                </span>

                {/* Prompt Optimization Action Button */}
                <div className="flex items-center gap-2">
                  {previousPrompt && (
                    <button
                      type="button"
                      onClick={handleRevertPrompt}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all shadow-sm"
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
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-300 underline decoration-dotted transition-colors"
                      title="Clear prompt and reset"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenOptimizeModal}
                    disabled={!userInput.trim() || isOptimizing || isLoading}
                    className="btn-optimize disabled:opacity-40 disabled:cursor-not-allowed group"
                    title="Customize priorities and daily habits before scheduling"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Refining…</span>
                      </>
                    ) : (
                      <>
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
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
                Drop your messy thoughts, deadlines, and commitments. Gemma 4
                weaves them with your daily habits and priorities.
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
                className="flex-1 w-full resize-none bg-transparent text-zinc-100 placeholder:text-zinc-600 text-xs leading-relaxed p-4 focus:outline-none scrollbar-thin"
                disabled={isLoading || isOptimizing}
              />

              {/* Character & Shortcut Counter */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05] bg-white/[0.01] text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">
                    {userInput.length > 0
                      ? `${userInput.length} chars`
                      : "Empty"}
                  </span>
                  {previousPrompt && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-indigo-300 flex items-center gap-1 text-[11px] font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        Optimized with daily habits
                      </span>
                      <button
                        type="button"
                        onClick={handleRevertPrompt}
                        className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted transition-colors text-[11px]"
                      >
                        undo
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-zinc-500 text-xs font-medium">
                  ⌘ / Ctrl + Enter
                </span>
              </div>
            </div>

            {/* Quick Inspiration Prompts with category badges */}
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2.5 block">
                Quick Prompts
              </span>
              <div className="flex flex-col gap-2">
                {INSPIRATION_PROMPTS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setUserInput(item.text)}
                    disabled={isLoading}
                    className="text-left group flex items-center gap-2.5 text-xs text-zinc-300 hover:text-white bg-[#0e1320]/80 hover:bg-[#13192b] border border-white/[0.06] hover:border-indigo-500/30 px-3 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${item.color} flex items-center gap-1 flex-shrink-0`}
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
                  <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wider">
                    Planned
                  </span>
                  <span className="text-base font-semibold text-sky-400 tabular-nums tracking-tight">
                    {stats.totalHours}h
                  </span>
                </div>
                <div className="border-r border-white/[0.06] px-2">
                  <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wider">
                    Deep Work
                  </span>
                  <span className="text-base font-semibold text-indigo-400 tabular-nums tracking-tight">
                    {stats.workHours}h
                  </span>
                </div>
                <div className="pl-2">
                  <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wider">
                    Breaks
                  </span>
                  <span className="text-base font-semibold text-emerald-400 tabular-nums tracking-tight">
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
              <span className="text-xs font-medium tabular-nums text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
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

      {/* ════════════════════════════════════════════════
          PROMPT OPTIMIZATION PREFERENCES MODAL
          Asks user for task priority and daily habits
         ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showOptimizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isOptimizing) setShowOptimizeModal(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0c101b] border border-white/[0.12] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg">
                    <div className="w-full h-full bg-[#0c101b] rounded-[10px] flex items-center justify-center">
                      <Wand2 className="w-5 h-5 text-indigo-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Optimize Schedule
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {dayOfWeek}, {formattedToday}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Tell Gemma 4 your priorities and habits to craft a complete agenda.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!isOptimizing) setShowOptimizeModal(false);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                  disabled={isOptimizing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form
                onSubmit={handleExecuteOptimization}
                className="overflow-y-auto space-y-5 pt-4 pr-1 flex-1 scrollbar-thin"
              >
                {/* 1. Priority Strategy */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2">
                    Priority Strategy (What matters most today?)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: "deep-work",
                        title: "Deadlines First",
                        desc: "Urgent work in peak focus hours",
                        badge: "Focused",
                      },
                      {
                        id: "balanced",
                        title: "Balanced Flow",
                        desc: "Even work & rest rhythm",
                        badge: "Equilibrium",
                      },
                      {
                        id: "wellness",
                        title: "Habits & Rest",
                        desc: "Gym, meals, & 8h sleep anchored",
                        badge: "Sustained",
                      },
                    ].map((opt) => {
                      const isSelected = formPrefs.priorityFocus === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setFormPrefs((p) => ({
                              ...p,
                              priorityFocus: opt.id as UserPreferences["priorityFocus"],
                            }))
                          }
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            isSelected
                              ? "bg-indigo-500/15 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] text-zinc-400"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? "text-white" : "text-zinc-300"
                              }`}
                            >
                              {opt.title}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-tight">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Daily Habits & Routines */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2">
                    Include Daily Tasks & Routines
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        key: "includeMorningRoutine",
                        icon: Sunrise,
                        title: "Morning Routine & Breakfast",
                        time: "07:30 – 08:30 (45-60m)",
                      },
                      {
                        key: "includeMeals",
                        icon: Utensils,
                        title: "Lunch & Dinner Breaks",
                        time: "Dedicated nutrition stops",
                      },
                      {
                        key: "includeWorkout",
                        icon: Dumbbell,
                        title: "Workout / Gym Session",
                        time: "1 – 2 hours exercise",
                      },
                      {
                        key: "includeSleep",
                        icon: Moon,
                        title: "Wind-down & 8h Sleep",
                        time: "23:00 – 07:00 restorative rest",
                      },
                      {
                        key: "includeBuffers",
                        icon: Coffee,
                        title: "15m Rest Buffers",
                        time: "Between intense sprint blocks",
                      },
                    ].map((habit) => {
                      const Icon = habit.icon;
                      const isChecked = Boolean(
                        formPrefs[habit.key as keyof UserPreferences]
                      );

                      return (
                        <button
                          key={habit.key}
                          type="button"
                          onClick={() =>
                            setFormPrefs((p) => ({
                              ...p,
                              [habit.key]: !p[habit.key as keyof UserPreferences],
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            isChecked
                              ? "bg-white/[0.04] border-indigo-500/40 text-white"
                              : "bg-white/[0.01] border-white/[0.04] text-zinc-500 opacity-60"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isChecked
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "bg-white/[0.03] text-zinc-600"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold truncate">
                                {habit.title}
                              </span>
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                  isChecked
                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                    : "border-white/[0.15] bg-transparent"
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {habit.time}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Peak Focus Window */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-1.5">
                    Peak Focus Window
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "morning", label: "Morning (09:00 - 13:00)" },
                      { id: "afternoon", label: "Afternoon (14:00 - 19:00)" },
                      { id: "flexible", label: "Flexible Energy" },
                    ].map((w) => {
                      const isSelected = formPrefs.focusWindow === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() =>
                            setFormPrefs((p) => ({
                              ...p,
                              focusWindow: w.id as UserPreferences["focusWindow"],
                            }))
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                            isSelected
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                              : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Custom Notes or Deadlines */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-1.5">
                    Specific Deadlines or Constraints (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPrefs.customNotes || ""}
                    onChange={(e) =>
                      setFormPrefs((p) => ({
                        ...p,
                        customNotes: e.target.value,
                      }))
                    }
                    placeholder="e.g. push_swap must be finished before 2pm, gym strictly at 6pm"
                    className="clean-input"
                  />
                </div>

                {/* Footer Actions */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowOptimizeModal(false)}
                    disabled={isOptimizing}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOptimizing}
                    className="btn-primary min-w-[170px]"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-200" />
                        <span>Optimizing with Gemma 4…</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2 text-pink-200" />
                        <span>Optimize Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
