"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  X,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { useScheduleStore, type Task } from "@/store/useScheduleStore";

const HOUR_HEIGHT = 68; // px per hour

/* Category theme definitions */
const categoryTheme: Record<
  string,
  {
    stripe: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    glow: string;
  }
> = {
  work: {
    stripe: "bg-violet-500",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-300",
    border: "hover:border-violet-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(139,92,246,0.18)]",
  },
  break: {
    stripe: "bg-emerald-400",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    border: "hover:border-emerald-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]",
  },
  routine: {
    stripe: "bg-sky-400",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-300",
    border: "hover:border-sky-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.18)]",
  },
};

const defaultTheme = {
  stripe: "bg-zinc-400",
  badgeBg: "bg-zinc-800",
  badgeText: "text-zinc-300",
  border: "hover:border-zinc-600",
  glow: "hover:shadow-lg",
};

function formatDateHeader(dateStr: string): { day: string; date: string } {
  if (!dateStr || dateStr === "Today") {
    return { day: "Today", date: "Scheduled" };
  }
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    }
  } catch {
    // fallback
  }
  return { day: dateStr, date: "" };
}

export function CalendarView() {
  const timelineData = useScheduleStore((s) => s.timelineData);
  const toggleTaskCompleted = useScheduleStore((s) => s.toggleTaskCompleted);
  const updateTask = useScheduleStore((s) => s.updateTask);
  const removeTask = useScheduleStore((s) => s.removeTask);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(30);

  // Determine grid hour range
  const { startHour, endHour, hours } = useMemo(() => {
    let minH = 6;
    let maxH = 22;

    timelineData.forEach((task) => {
      const [h] = (task.startTime || "09:00").split(":").map(Number);
      if (!isNaN(h) && h < minH) minH = Math.max(0, h);
      const [endH] = (task.endTime || "").split(":").map(Number);
      if (!isNaN(endH) && endH > maxH) maxH = Math.min(24, endH + 1);
    });

    const hrs: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      hrs.push(h);
    }
    return { startHour: minH, endHour: maxH, hours: hrs };
  }, [timelineData]);

  // Group tasks by date
  const { dateColumns, tasksByDate } = useMemo(() => {
    const datesSet = new Set<string>();
    timelineData.forEach((task) => {
      datesSet.add(task.date || "Today");
    });

    const cols = Array.from(datesSet).sort();
    if (cols.length === 0) cols.push("Today");

    const grouped: Record<string, Task[]> = {};
    cols.forEach((col) => {
      grouped[col] = timelineData.filter((t) => (t.date || "Today") === col);
    });

    return { dateColumns: cols, tasksByDate: grouped };
  }, [timelineData]);

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditStartTime(task.startTime);
    setEditDuration(task.duration || 30);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const [h, m] = editStartTime.split(":").map(Number);
    let newEndTime = editingTask.endTime;
    if (!isNaN(h) && !isNaN(m)) {
      const total = h * 60 + m + Number(editDuration);
      const endH = Math.floor(total / 60) % 24;
      const endM = total % 60;
      newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(
        2,
        "0"
      )}`;
    }

    updateTask(editingTask.id, {
      title: editTitle.trim() || editingTask.title,
      startTime: editStartTime,
      duration: Number(editDuration),
      endTime: newEndTime,
    });

    setEditingTask(null);
  };

  const totalGridHeight = (endHour - startHour) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Scrollable Calendar Canvas ── */}
      <div className="relative flex-1 overflow-x-auto overflow-y-auto rounded-2xl bg-[#0c0c10] border border-white/[0.08] shadow-2xl">
        <div className="min-w-[680px]">
          {/* ── Column Headers ── */}
          <div className="sticky top-0 z-30 flex border-b border-white/[0.07] bg-[#0c0c10]/95 backdrop-blur-xl">
            {/* Hour column corner */}
            <div className="w-16 flex-shrink-0 border-r border-white/[0.06] p-3.5 flex items-center justify-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                GMT
              </span>
            </div>

            {/* Date columns */}
            <div
              className="flex-1 grid"
              style={{
                gridTemplateColumns: `repeat(${dateColumns.length}, minmax(0, 1fr))`,
              }}
            >
              {dateColumns.map((colDate) => {
                const { day, date } = formatDateHeader(colDate);
                const count = tasksByDate[colDate]?.length || 0;

                return (
                  <div
                    key={colDate}
                    className="px-4 py-3 border-r border-white/[0.06] last:border-r-0 flex items-center justify-between"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-zinc-200 tracking-tight">
                        {day}
                      </span>
                      {date && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          {date}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.04]">
                      {count} {count === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Time-Grid Body ── */}
          <div
            className="relative flex"
            style={{ height: `${totalGridHeight}px` }}
          >
            {/* Left Hour Axis */}
            <div className="w-16 flex-shrink-0 border-r border-white/[0.06] bg-[#09090d]/60 select-none">
              {hours.map((hour, idx) => {
                if (idx === hours.length - 1) return null;
                const timeStr = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative border-b border-white/[0.04] px-2.5 text-right"
                  >
                    <span className="text-[11px] font-mono text-zinc-500 relative -top-2.5">
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Column lanes for tasks */}
            <div
              className="flex-1 grid relative"
              style={{
                gridTemplateColumns: `repeat(${dateColumns.length}, minmax(0, 1fr))`,
              }}
            >
              {/* Subtle horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map((hour, idx) => {
                  if (idx === hours.length - 1) return null;
                  return (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="border-b border-white/[0.03] w-full"
                    />
                  );
                })}
              </div>

              {/* Task Columns */}
              {dateColumns.map((colDate) => {
                const columnTasks = tasksByDate[colDate] || [];

                return (
                  <div
                    key={colDate}
                    className="relative border-r border-white/[0.06] last:border-r-0 h-full"
                  >
                    {columnTasks.map((task) => {
                      const [h, m] = (task.startTime || "09:00")
                        .split(":")
                        .map(Number);
                      const startMins =
                        (isNaN(h) ? 9 : h - startHour) * 60 +
                        (isNaN(m) ? 0 : m);
                      const topPx = (startMins / 60) * HOUR_HEIGHT;
                      const duration = task.duration || 30;
                      const heightPx = Math.max(
                        34,
                        (duration / 60) * HOUR_HEIGHT - 3
                      );

                      const theme =
                        categoryTheme[task.category?.toLowerCase()] ||
                        defaultTheme;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.01, zIndex: 20 }}
                          onClick={() => openEditModal(task)}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                          }}
                          className={`absolute left-2 right-2 rounded-xl p-2.5
                                     cursor-pointer bg-[#14141c]/95 border border-white/[0.08]
                                     backdrop-blur-md transition-all duration-200
                                     flex items-start gap-2.5 overflow-hidden group
                                     ${theme.border} ${theme.glow}
                                     ${task.completed ? "opacity-35" : ""}`}
                        >
                          {/* Accent Stripe indicator */}
                          <div
                            className={`w-1 h-full min-h-[16px] rounded-full flex-shrink-0 ${theme.stripe}`}
                          />

                          {/* Task details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                            {/* Top row: Title and time */}
                            <div className="flex items-baseline justify-between gap-1.5">
                              <span
                                className={`text-xs font-medium text-zinc-100 truncate ${
                                  task.completed ? "line-through text-zinc-500" : ""
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                                {task.startTime}
                              </span>
                            </div>

                            {/* Bottom row (if card is tall enough) */}
                            {heightPx > 48 && (
                              <div className="flex items-center justify-between gap-1 pt-1 mt-auto">
                                <span
                                  className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText}`}
                                >
                                  {task.category || "routine"}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {task.duration}m
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Raycast-style Command Modal ── */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Dialog panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-[#121218] border border-white/[0.12] p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      Edit Task
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {editingTask.id.slice(0, 8)}…
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTask(null)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="clean-input"
                    placeholder="Task name"
                  />
                </div>

                {/* Time & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                      Start Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        required
                        className="clean-input font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={720}
                      step={5}
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      required
                      className="clean-input font-mono"
                    />
                  </div>
                </div>

                {/* Advice preview if present */}
                {editingTask.description && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 leading-relaxed">
                    <span className="text-violet-400 font-medium">Advice:</span>{" "}
                    {editingTask.description}
                  </div>
                )}

                {/* Bottom row: complete toggle + delete */}
                <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      toggleTaskCompleted(editingTask.id);
                      setEditingTask({
                        ...editingTask,
                        completed: !editingTask.completed,
                      });
                    }}
                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {editingTask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-600" />
                    )}
                    <span>
                      {editingTask.completed ? "Completed" : "Mark Done"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      removeTask(editingTask.id);
                      setEditingTask(null);
                    }}
                    className="text-zinc-500 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
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
