"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Send,
  Brain,
  CalendarClock,
  Loader2,
  LayoutList,
} from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { TimelineSkeleton } from "@/components/TimelineSkeleton";
import { TimelineList } from "@/components/TimelineList";

export default function Home() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userInput = useScheduleStore((s) => s.userInput);
  const setUserInput = useScheduleStore((s) => s.setUserInput);
  const isLoading = useScheduleStore((s) => s.isLoading);
  const timelineData = useScheduleStore((s) => s.timelineData);

  const hasTimeline = timelineData.length > 0;
  const isEmpty = !isLoading && !hasTimeline;

  const handleGenerate = () => {
    if (!userInput.trim() || isLoading) return;
    // TODO: wire up Gemini API call here
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] rounded-full bg-accent/[0.07] blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-neon/[0.05] blur-[130px]" />
      </div>

      {/* ── Top bar ── */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-10 h-16 border-b border-surface-500/10 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-glow">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            <span className="gradient-text">Allili</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted bg-surface-200/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-surface-500/20">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          AI Schedule Planner
        </div>
      </header>

      {/* ── Main split layout ── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row">
        {/* ════════════════════════════════════════════════
            LEFT PANEL — Brain Dump
           ════════════════════════════════════════════════ */}
        <motion.aside
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full lg:w-[440px] xl:w-[480px] flex-shrink-0
                     border-b lg:border-b-0 lg:border-r border-surface-500/10
                     flex flex-col"
        >
          <div className="flex-1 flex flex-col p-6 lg:p-8 gap-6">
            {/* Section header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Brain Dump
              </h1>
              <p className="text-sm text-muted">
                Describe your day, tasks, or goals — the AI will craft
                your perfect schedule.
              </p>
            </div>

            {/* ── Glassmorphic textarea card ── */}
            <div className="glass-card flex-1 flex flex-col p-1 min-h-[240px]">
              <textarea
                ref={textareaRef}
                id="brain-dump-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="e.g. I have a meeting at 10am, need to finish the report by 2pm, hit the gym, and study for 2 hours…"
                className="flex-1 w-full resize-none bg-transparent text-foreground
                           placeholder:text-muted/60 text-sm leading-relaxed
                           p-4 rounded-xl
                           focus:outline-none focus:ring-0
                           scrollbar-thin"
                disabled={isLoading}
              />

              {/* Character hint */}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[11px] text-muted/50 font-mono">
                  {userInput.length > 0
                    ? `${userInput.length} chars`
                    : ""}
                </span>
              </div>
            </div>

            {/* ── Generate button ── */}
            <motion.button
              id="generate-schedule-btn"
              onClick={handleGenerate}
              disabled={!userInput.trim() || isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-glow w-full flex items-center justify-center gap-2.5
                         disabled:opacity-40 disabled:cursor-not-allowed
                         disabled:shadow-none disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Schedule
                </>
              )}
            </motion.button>

            {/* Keyboard hint */}
            <p className="text-center text-[11px] text-muted/40">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-surface-300/50 text-muted/60 font-mono text-[10px]">
                ⌘ Enter
              </kbd>{" "}
              to generate
            </p>
          </div>
        </motion.aside>

        {/* ════════════════════════════════════════════════
            RIGHT PANEL — Timeline
           ════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1 flex flex-col min-h-0"
        >
          {/* Panel header */}
          <div className="flex items-center gap-2 px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
            <CalendarClock className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold tracking-tight">
              Your Timeline
            </h2>
            {hasTimeline && (
              <span className="ml-auto text-xs text-muted bg-surface-200/60 px-2.5 py-1 rounded-full border border-surface-500/20">
                {timelineData.length} task
                {timelineData.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 relative">
            {/* Loading state */}
            {isLoading && <TimelineSkeleton />}

            {/* Timeline items */}
            {!isLoading && hasTimeline && <TimelineList />}

            {/* Empty state */}
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-20"
              >
                {/* Decorative circle */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-surface-200 border border-surface-500/20 flex items-center justify-center">
                    <LayoutList className="w-8 h-8 text-surface-700" />
                  </div>
                  {/* Orbiting ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-3 rounded-full border border-dashed border-surface-600/40"
                  />
                  {/* Accent dot on the orbit */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-3"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-glow" />
                  </motion.div>
                </div>

                <h3 className="text-base font-semibold text-muted mb-1">
                  No schedule yet
                </h3>
                <p className="text-sm text-muted/60 max-w-[260px]">
                  Dump your thoughts in the left panel and hit{" "}
                  <span className="text-accent font-medium">Generate</span>{" "}
                  to see your timeline appear here.
                </p>
              </motion.div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
