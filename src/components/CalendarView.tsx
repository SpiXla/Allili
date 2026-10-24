"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  Circle,
  X,
  Calendar as CalendarIcon,
  Edit3,
  Save,
} from "lucide-react";
import { useScheduleStore, type Task } from "@/store/useScheduleStore";

const HOUR_HEIGHT = 64; // pixels per hour (approx 1.06px per minute)

/* Category style badges */
const categoryStyles: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  }
> = {
  work: {
    bg: "bg-accent/15 hover:bg-accent/25",
    border: "border-accent/40 hover:border-accent/70",
    text: "text-purple-100",
    badgeBg: "bg-accent/30",
    badgeText: "text-purple-200",
    glow: "hover:shadow-glow/20",
  },
  break: {
    bg: "bg-emerald-500/15 hover:bg-emerald-500/25",
    border: "border-emerald-500/40 hover:border-emerald-500/70",
    text: "text-emerald-100",
    badgeBg: "bg-emerald-500/30",
    badgeText: "text-emerald-200",
    glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]",
  },
  routine: {
    bg: "bg-neon/15 hover:bg-neon/25",
    border: "border-neon/40 hover:border-neon/70",
    text: "text-sky-100",
    badgeBg: "bg-neon/30",
    badgeText: "text-sky-200",
    glow: "hover:shadow-glow-blue/20",
  },
};

const defaultCategoryStyle = {
  bg: "bg-surface-300/40 hover:bg-surface-300/60",
  border: "border-surface-500/40 hover:border-surface-400",
  text: "text-foreground",
  badgeBg: "bg-surface-400/30",
  badgeText: "text-muted",
  glow: "hover:shadow-lg",
};

/**
 * Format date string (YYYY-MM-DD) into readable label (e.g. "Mon, Oct 24")
 */
function formatDateLabel(dateStr: string): string {
  if (!dateStr || dateStr === "Today") return "Today";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function CalendarView() {
  const timelineData = useScheduleStore((s) => s.timelineData);
  const toggleTaskCompleted = useScheduleStore((s) => s.toggleTaskCompleted);
  const updateTask = useScheduleStore((s) => s.updateTask);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(30);

  // Determine grid hour range
  const { startHour, endHour, hours } = useMemo(() => {
    let minH = 6;
    let maxH = 23;

    timelineData.forEach((task) => {
      const [h] = (task.startTime || "09:00").split(":").map(Number);
      if (!isNaN(h)) {
        if (h < minH) minH = Math.max(0, h);
      }
      const [endH] = (task.endTime || "").split(":").map(Number);
      if (!isNaN(endH)) {
        if (endH > maxH) maxH = Math.min(24, endH + 1);
      }
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
      grouped[col] = timelineData.filter(
        (t) => (t.date || "Today") === col
      );
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

    // Recalculate end time
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
    <div className="flex flex-col h-full w-full select-none">
      {/* ── Calendar container ── */}
      <div className="relative flex-1 overflow-x-auto overflow-y-auto rounded-2xl glass-card border border-surface-500/20 bg-surface-100/50">
        <div className="min-w-[640px]">
          {/* ── Date Column Headers ── */}
          <div className="sticky top-0 z-20 flex border-b border-surface-500/20 bg-surface-200/90 backdrop-blur-md">
            {/* Hour axis header spacer */}
            <div className="w-16 flex-shrink-0 border-r border-surface-500/20 p-3 text-center">
              <Clock className="w-3.5 h-3.5 text-muted mx-auto" />
            </div>

            {/* Date column labels */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dateColumns.length}, minmax(0, 1fr))` }}>
              {dateColumns.map((colDate) => (
                <div
                  key={colDate}
                  className="px-4 py-3 border-r border-surface-500/10 last:border-r-0 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs font-semibold text-foreground tracking-wide">
                      {formatDateLabel(colDate)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted bg-surface-300/40 px-2 py-0.5 rounded-full font-mono">
                    {tasksByDate[colDate]?.length || 0} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main Time Grid Body ── */}
          <div className="relative flex" style={{ height: `${totalGridHeight}px` }}>
            {/* Left Hour Axis */}
            <div className="w-16 flex-shrink-0 border-r border-surface-500/20 bg-surface-200/20">
              {hours.map((hour, idx) => {
                if (idx === hours.length - 1) return null;
                const timeString = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative border-b border-surface-500/10 px-2 text-right"
                  >
                    <span className="text-[11px] font-mono text-muted/70 relative -top-2.5">
                      {timeString}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Columns for Each Date */}
            <div
              className="flex-1 grid relative"
              style={{
                gridTemplateColumns: `repeat(${dateColumns.length}, minmax(0, 1fr))`,
              }}
            >
              {/* Background horizontal hour lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map((hour, idx) => {
                  if (idx === hours.length - 1) return null;
                  return (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="border-b border-surface-500/10 w-full"
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
                    className="relative border-r border-surface-500/10 last:border-r-0 h-full"
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
                        36,
                        (duration / 60) * HOUR_HEIGHT - 4
                      );

                      const style =
                        categoryStyles[task.category?.toLowerCase()] ||
                        defaultCategoryStyle;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.01, zIndex: 10 }}
                          onClick={() => openEditModal(task)}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                          }}
                          className={`absolute left-1.5 right-1.5 rounded-xl p-2.5
                                     cursor-pointer border backdrop-blur-md transition-all duration-200
                                     flex flex-col justify-between overflow-hidden
                                     ${style.bg} ${style.border} ${style.glow}
                                     ${task.completed ? "opacity-40" : ""}`}
                        >
                          {/* Top row: title & time */}
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <span
                              className={`text-xs font-semibold leading-tight truncate ${
                                style.text
                              } ${task.completed ? "line-through" : ""}`}
                            >
                              {task.title}
                            </span>
                            <span className="text-[10px] font-mono text-muted/80 flex-shrink-0">
                              {task.startTime}
                            </span>
                          </div>

                          {/* Bottom row: category & duration (if space permits) */}
                          {heightPx > 50 && (
                            <div className="flex items-center justify-between gap-1 text-[10px] mt-1 pt-1 border-t border-surface-500/10">
                              <span
                                className={`px-1.5 py-0.5 rounded-md font-medium uppercase text-[9px] tracking-wider ${style.badgeBg} ${style.badgeText}`}
                              >
                                {task.category || "routine"}
                              </span>
                              <span className="text-muted/70 font-mono">
                                {task.duration}m
                              </span>
                            </div>
                          )}
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

      {/* ── Sleek Edit Modal / Popover ── */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-surface-50/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative z-10 w-full max-w-md rounded-2xl glass-card p-6 border border-surface-500/30 bg-surface-200/95 shadow-glow"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Edit Task
                    </h3>
                    <p className="text-xs text-muted">
                      Modify schedule details below
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTask(null)}
                  className="text-muted hover:text-foreground transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Title Input */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="input-field text-sm"
                    placeholder="e.g. Deep Work Session"
                  />
                </div>

                {/* Grid for Start Time & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Start Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      required
                      className="input-field text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={720}
                      step={5}
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      required
                      className="input-field text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Status Toggle in Modal */}
                <div className="pt-2 flex items-center justify-between border-t border-surface-500/10">
                  <button
                    type="button"
                    onClick={() => {
                      toggleTaskCompleted(editingTask.id);
                      setEditingTask({
                        ...editingTask,
                        completed: !editingTask.completed,
                      });
                    }}
                    className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    {editingTask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    <span>
                      {editingTask.completed
                        ? "Completed"
                        : "Mark as Completed"}
                    </span>
                  </button>

                  <span className="text-[11px] text-muted capitalize px-2 py-0.5 rounded-full bg-surface-300/40">
                    {editingTask.category || "routine"}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="btn-outline text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-glow text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
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
