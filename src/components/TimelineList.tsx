"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Circle,
  Tag,
  Flame,
} from "lucide-react";
import { useScheduleStore, type Task } from "@/store/useScheduleStore";

/* ── Priority colour mapping ───────────────────────────── */
const priorityConfig: Record<
  Task["priority"],
  { color: string; bg: string; ring: string; label: string }
> = {
  high: {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
    label: "High",
  },
  medium: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    label: "Medium",
  },
  low: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    label: "Low",
  },
};

/* ── Stagger animation variants ────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

/* ── Single timeline card ──────────────────────────────── */
function TimelineCard({ task }: { task: Task }) {
  const toggleTaskCompleted = useScheduleStore(
    (s) => s.toggleTaskCompleted
  );
  const prio = priorityConfig[task.priority];

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="flex items-start gap-4 group"
    >
      {/* ── Timeline spine ── */}
      <div className="flex flex-col items-center pt-2 min-w-[20px]">
        {/* Dot */}
        <motion.div
          initial={false}
          animate={{
            scale: task.completed ? 0.9 : 1,
            backgroundColor: task.completed
              ? "rgb(34 197 94)"
              : "rgb(168 85 247)",
          }}
          className="w-3 h-3 rounded-full ring-4 ring-surface-200 z-10 transition-colors"
        />
        {/* Connector line – rendered for all but last */}
        <div className="w-px flex-1 min-h-[40px] bg-gradient-to-b from-surface-600/60 to-transparent mt-1" />
      </div>

      {/* ── Card ── */}
      <motion.div
        whileHover={{ y: -2 }}
        className={`flex-1 glass-card p-5 mb-2 transition-all duration-300
          group-hover:border-accent/20 group-hover:shadow-glow/10
          ${task.completed ? "opacity-60" : ""}`}
      >
        {/* Top row: time + priority */}
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-xs font-mono text-muted">
            <Clock className="w-3 h-3" />
            {task.startTime} – {task.endTime}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${prio.bg} ${prio.color} ${prio.ring}`}
          >
            <Flame className="w-3 h-3" />
            {prio.label}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-semibold text-base mb-1 transition-all ${
            task.completed
              ? "line-through text-muted"
              : "text-foreground"
          }`}
        >
          {task.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted leading-relaxed mb-3">
          {task.description}
        </p>

        {/* Bottom row: category + toggle */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-muted bg-surface-300/50 px-2.5 py-1 rounded-full">
            <Tag className="w-3 h-3" />
            {task.category}
          </span>

          <button
            onClick={() => toggleTaskCompleted(task.id)}
            className="flex items-center gap-1.5 text-xs font-medium
                       text-muted hover:text-accent transition-colors"
          >
            {task.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            {task.completed ? "Done" : "Mark done"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Timeline list (public component) ──────────────────── */
export function TimelineList() {
  const timelineData = useScheduleStore((s) => s.timelineData);

  if (timelineData.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col"
    >
      <AnimatePresence mode="popLayout">
        {timelineData.map((task) => (
          <TimelineCard key={task.id} task={task} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
