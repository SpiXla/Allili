"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  X,
  Trash2,
  SlidersHorizontal,
  Clock,
  Sparkles,
  LayoutGrid,
  ListFilter,
  Calendar as CalendarIcon,
  ChevronRight,
  Briefcase,
  Coffee,
  SunMedium,
} from "lucide-react";
import { useScheduleStore, type Task } from "@/store/useScheduleStore";

// 96px per hour ensures 15m = 24px, 30m = 48px, 60m = 96px with zero overlap
const HOUR_HEIGHT = 96;

/* ── Category styling config with rich Cyber-Luxe palette ── */
interface CategoryStyle {
  label: string;
  stripe: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  glow: string;
  cardBg: string;
  dot: string;
  icon: typeof Briefcase;
}

const categoryTheme: Record<string, CategoryStyle> = {
  work: {
    label: "Deep Work",
    stripe: "bg-gradient-to-b from-indigo-400 via-indigo-500 to-purple-500",
    badgeBg: "bg-indigo-500/15 border border-indigo-500/30",
    badgeText: "text-indigo-300",
    border: "border-indigo-500/30 hover:border-indigo-400/60",
    glow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.22)]",
    cardBg: "bg-gradient-to-br from-[#161a2e]/95 via-[#131626]/95 to-[#0f111e]/95",
    dot: "bg-indigo-400",
    icon: Briefcase,
  },
  break: {
    label: "Break & Rest",
    stripe: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-500",
    badgeBg: "bg-emerald-500/15 border border-emerald-500/30",
    badgeText: "text-emerald-300",
    border: "border-emerald-500/30 hover:border-emerald-400/60",
    glow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.22)]",
    cardBg: "bg-gradient-to-br from-[#11241c]/95 via-[#0e1c16]/95 to-[#0b1611]/95",
    dot: "bg-emerald-400",
    icon: Coffee,
  },
  routine: {
    label: "Routine",
    stripe: "bg-gradient-to-b from-amber-400 via-orange-400 to-rose-400",
    badgeBg: "bg-amber-500/15 border border-amber-500/30",
    badgeText: "text-amber-300",
    border: "border-amber-500/30 hover:border-amber-400/60",
    glow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.22)]",
    cardBg: "bg-gradient-to-br from-[#241a12]/95 via-[#1c140e]/95 to-[#16100b]/95",
    dot: "bg-amber-400",
    icon: SunMedium,
  },
};

const defaultTheme: CategoryStyle = {
  label: "Task",
  stripe: "bg-gradient-to-b from-slate-400 to-slate-600",
  badgeBg: "bg-slate-800 border border-slate-700",
  badgeText: "text-slate-300",
  border: "border-slate-700/40 hover:border-slate-500/50",
  glow: "hover:shadow-[0_8px_25px_rgba(255,255,255,0.06)]",
  cardBg: "bg-gradient-to-br from-[#161922]/95 via-[#12141c]/95 to-[#0e1017]/95",
  dot: "bg-slate-400",
  icon: Clock,
};

function formatDateHeader(dateStr: string): {
  dayName: string;
  formattedDate: string;
  isToday: boolean;
} {
  if (!dateStr || dateStr.toLowerCase() === "today") {
    return { dayName: "Today", formattedDate: "Schedule", isToday: true };
  }
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      return {
        dayName: isToday
          ? "Today"
          : d.toLocaleDateString("en-US", { weekday: "short" }),
        formattedDate: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        isToday,
      };
    }
  } catch {
    // fallback
  }
  return { dayName: dateStr, formattedDate: "", isToday: false };
}

interface PositionedTask {
  task: Task;
  topPx: number;
  heightPx: number;
  leftPercent: number;
  widthPercent: number;
}

/**
 * Computes pixel-accurate, collision-free layout for a day's tasks
 */
function layoutDayTasks(tasks: Task[], startHour: number): PositionedTask[] {
  if (!tasks.length) return [];

  // 1. Convert each task to pixel coordinates
  const items = tasks.map((task) => {
    const [h, m] = (task.startTime || "09:00").split(":").map(Number);
    const startMins =
      (isNaN(h) ? 9 : h - startHour) * 60 + (isNaN(m) ? 0 : m);
    const duration = Math.max(10, task.duration || 30);

    const topPx = (startMins / 60) * HOUR_HEIGHT;
    // Exactly proportional height minus 3px gap for clean separation
    const heightPx = Math.max(22, (duration / 60) * HOUR_HEIGHT - 3);
    const bottomPx = topPx + heightPx;

    return {
      task,
      startMins,
      duration,
      topPx,
      heightPx,
      bottomPx,
      col: 0,
    };
  });

  // Sort chronologically by start time, then duration descending
  items.sort((a, b) => a.topPx - b.topPx || b.duration - a.duration);

  // 2. Group into clusters based on visual pixel overlap (with 2px buffer)
  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterBottom = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.topPx < clusterBottom - 2) {
      currentCluster.push(item);
      clusterBottom = Math.max(clusterBottom, item.bottomPx);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterBottom = item.bottomPx;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. In each cluster, assign sub-columns so overlapping cards sit side-by-side
  const positioned: PositionedTask[] = [];

  for (const cluster of clusters) {
    const colBottoms: number[] = [];

    for (const item of cluster) {
      let col = 0;
      while (col < colBottoms.length && colBottoms[col] > item.topPx + 2) {
        col++;
      }
      colBottoms[col] = item.bottomPx;
      item.col = col;
    }

    const totalCols = Math.max(1, colBottoms.length);

    for (const item of cluster) {
      const widthPercent = 100 / totalCols;
      const leftPercent = item.col * widthPercent;

      positioned.push({
        task: item.task,
        topPx: item.topPx,
        heightPx: item.heightPx,
        leftPercent,
        widthPercent,
      });
    }
  }

  return positioned;
}

export function CalendarView() {
  const timelineData = useScheduleStore((s) => s.timelineData);
  const toggleTaskCompleted = useScheduleStore((s) => s.toggleTaskCompleted);
  const updateTask = useScheduleStore((s) => s.updateTask);
  const removeTask = useScheduleStore((s) => s.removeTask);

  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(30);
  const [editCategory, setEditCategory] = useState<string>("work");

  // Determine grid hour range with comfortable buffers
  const { startHour, endHour, hours } = useMemo(() => {
    let minH = 8;
    let maxH = 20;

    timelineData.forEach((task) => {
      const [h] = (task.startTime || "09:00").split(":").map(Number);
      if (!isNaN(h)) {
        minH = Math.min(minH, Math.max(0, h - 1));
      }
      const [endH, endM] = (task.endTime || "").split(":").map(Number);
      if (!isNaN(endH)) {
        const extra = (endM || 0) > 0 ? 2 : 1;
        maxH = Math.max(maxH, Math.min(24, endH + extra));
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
      grouped[col] = timelineData.filter((t) => (t.date || "Today") === col);
    });

    return { dateColumns: cols, tasksByDate: grouped };
  }, [timelineData]);

  // Layout all days with overlap resolution
  const positionedTasksByDate = useMemo(() => {
    const result: Record<string, PositionedTask[]> = {};
    dateColumns.forEach((col) => {
      result[col] = layoutDayTasks(tasksByDate[col] || [], startHour);
    });
    return result;
  }, [dateColumns, tasksByDate, startHour]);

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditStartTime(task.startTime);
    setEditDuration(task.duration || 30);
    setEditCategory(task.category || "work");
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
      category: editCategory,
    });

    setEditingTask(null);
  };

  const totalGridHeight = (endHour - startHour) * HOUR_HEIGHT;
  const isSingleDay = dateColumns.length === 1;

  // Minimum column width of 260px ensures multi-day plans never cramp text
  const columnWidth = isSingleDay ? "100%" : "260px";
  const minCanvasWidth = isSingleDay
    ? "100%"
    : `${dateColumns.length * 260 + 64}px`;

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* ── Subheader / View Controller ── */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-200">
            {dateColumns.length === 1
              ? "Daily Plan"
              : `${dateColumns.length} Days Planned`}
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
            {startHour.toString().padStart(2, "0")}:00 –{" "}
            {endHour.toString().padStart(2, "0")}:00
          </span>
        </div>

        {/* View Switcher: Grid vs Agenda */}
        <div className="flex items-center gap-1 p-1 bg-[#0b0e17] border border-white/[0.08] rounded-xl shadow-inner">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === "grid"
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Time Grid</span>
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === "agenda"
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* ── View 1: Visual Time Grid ── */}
      {viewMode === "grid" && (
        <div className="relative flex-1 overflow-x-auto overflow-y-auto rounded-2xl bg-[#080b12] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div
            style={{ minWidth: minCanvasWidth }}
            className={isSingleDay ? "max-w-2xl mx-auto w-full" : "w-full"}
          >
            {/* ── Sticky Date Header ── */}
            <div className="sticky top-0 z-30 flex border-b border-white/[0.08] bg-[#0c0f18]/95 backdrop-blur-2xl">
              {/* Hour corner */}
              <div className="w-16 flex-shrink-0 border-r border-white/[0.06] py-3 px-2 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
              </div>

              {/* Day header columns */}
              <div
                className="flex-1 grid"
                style={{
                  gridTemplateColumns: `repeat(${dateColumns.length}, minmax(${columnWidth}, 1fr))`,
                }}
              >
                {dateColumns.map((colDate) => {
                  const { dayName, formattedDate, isToday } =
                    formatDateHeader(colDate);
                  const count = tasksByDate[colDate]?.length || 0;

                  return (
                    <div
                      key={colDate}
                      className="px-4 py-2.5 border-r border-white/[0.06] last:border-r-0 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold tracking-tight ${
                            isToday ? "text-indigo-400 font-bold" : "text-slate-200"
                          }`}
                        >
                          {dayName}
                        </span>
                        {formattedDate && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {formattedDate}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.08]">
                        {count} {count === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Time-Grid Canvas ── */}
            <div
              className="relative flex"
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* Left Hour Axis */}
              <div className="w-16 flex-shrink-0 border-r border-white/[0.06] bg-[#070910]/90 select-none relative">
                {hours.map((hour, idx) => {
                  const topPx = idx * HOUR_HEIGHT;
                  const timeStr = `${String(hour).padStart(2, "0")}:00`;
                  return (
                    <div
                      key={hour}
                      style={{ top: `${topPx}px` }}
                      className="absolute left-0 right-0 -translate-y-1/2 pr-3 text-right"
                    >
                      <span className="text-xs font-medium tabular-nums text-zinc-400">
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
                  gridTemplateColumns: `repeat(${dateColumns.length}, minmax(${columnWidth}, 1fr))`,
                }}
              >
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {hours.map((hour, idx) => {
                    const topPx = idx * HOUR_HEIGHT;
                    return (
                      <div key={hour}>
                        {/* Major hour line */}
                        <div
                          style={{ top: `${topPx}px` }}
                          className="absolute left-0 right-0 border-t border-white/[0.06]"
                        />
                        {/* Minor half-hour dashed line */}
                        {idx < hours.length - 1 && (
                          <div
                            style={{ top: `${topPx + HOUR_HEIGHT / 2}px` }}
                            className="absolute left-0 right-0 border-t border-dashed border-white/[0.03]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns */}
                {dateColumns.map((colDate) => {
                  const dayPositions = positionedTasksByDate[colDate] || [];

                  return (
                    <div
                      key={colDate}
                      className="relative border-r border-white/[0.06] last:border-r-0 h-full"
                    >
                      {dayPositions.map(
                        ({ task, topPx, heightPx, leftPercent, widthPercent }) => {
                          const theme =
                            categoryTheme[task.category?.toLowerCase()] ||
                            defaultTheme;

                          // 3 distinct rendering modes based on exact height
                          const isPill = heightPx < 36; // 15m tasks / micro breaks
                          const isCompact = heightPx >= 36 && heightPx < 70; // 30m tasks
                          const isStandard = heightPx >= 70; // 45m+ tasks

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.015, zIndex: 30 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => openEditModal(task)}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                left: `calc(${leftPercent}% + 5px)`,
                                width: `calc(${widthPercent}% - 10px)`,
                              }}
                              className={`absolute rounded-xl border backdrop-blur-xl
                                         cursor-pointer transition-all duration-200
                                         overflow-hidden group shadow-md
                                         ${theme.cardBg} ${theme.border} ${theme.glow}
                                         ${
                                           task.completed
                                             ? "opacity-35 grayscale-[60%]"
                                             : ""
                                         }`}
                            >
                              {/* Left category accent strip with rounded end caps */}
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1 ${theme.stripe}`}
                              />

                              {/* ── Mode 1: Sleek Event Pill (<36px, e.g. 15-min break) ── */}
                              {isPill && (
                                <div className="h-full pl-3 pr-2 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`}
                                    />
                                    <span
                                      className={`text-[11px] font-medium truncate text-slate-100 ${
                                        task.completed ? "line-through text-slate-500" : ""
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[10px] font-medium tabular-nums text-slate-300">
                                      {task.startTime}
                                    </span>
                                    <span className="text-[9px] font-semibold tabular-nums text-slate-300 bg-white/[0.08] px-1 py-0.5 rounded">
                                      {task.duration}m
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* ── Mode 2: Compact Card (36px - 70px, e.g. 30-min task) ── */}
                              {isCompact && (
                                <div className="h-full p-2 pl-3.5 flex flex-col justify-between">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTaskCompleted(task.id);
                                        }}
                                        className="text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                                      >
                                        {task.completed ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : (
                                          <Circle className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                        )}
                                      </button>
                                      <span
                                        className={`text-xs font-semibold text-slate-100 truncate ${
                                          task.completed ? "line-through text-slate-500" : ""
                                        }`}
                                      >
                                        {task.title}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-medium tabular-nums text-slate-300 flex-shrink-0">
                                      {task.startTime}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-0.5">
                                    <span
                                      className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText}`}
                                    >
                                      {task.category || "routine"}
                                    </span>
                                    <span className="text-[10px] font-medium tabular-nums text-slate-300">
                                      {task.duration}m
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* ── Mode 3: Standard / Expanded Card (>=70px, e.g. 45–90+ mins) ── */}
                              {isStandard && (
                                <div className="h-full p-3 pl-4 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-start justify-between gap-1.5 mb-1">
                                      <div className="flex items-start gap-2 min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTaskCompleted(task.id);
                                          }}
                                          className="text-slate-500 hover:text-emerald-400 transition-colors mt-0.5 flex-shrink-0"
                                        >
                                          {task.completed ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                          ) : (
                                            <Circle className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                                          )}
                                        </button>
                                        <div>
                                          <h4
                                            className={`text-xs font-bold text-slate-100 line-clamp-2 leading-snug ${
                                              task.completed ? "line-through text-slate-500" : ""
                                            }`}
                                          >
                                            {task.title}
                                          </h4>
                                          <span className="text-[11px] font-medium tabular-nums text-slate-300 block mt-0.5">
                                            {task.startTime}
                                            {task.endTime ? ` – ${task.endTime}` : ""}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {task.description && heightPx >= 95 && (
                                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed pl-5 mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.05]">
                                    <span
                                      className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText}`}
                                    >
                                      {theme.label}
                                    </span>
                                    <span className="text-[10px] font-medium tabular-nums text-slate-300">
                                      {task.duration} mins
                                    </span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View 2: Agenda Stream View ── */}
      {viewMode === "agenda" && (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 rounded-2xl">
          {dateColumns.map((colDate) => {
            const tasks = tasksByDate[colDate] || [];
            const { dayName, formattedDate, isToday } =
              formatDateHeader(colDate);

            return (
              <div
                key={colDate}
                className="rounded-2xl bg-[#0c0f18]/85 border border-white/[0.08] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              >
                {/* Date subheader */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    <span
                      className={`text-sm font-semibold ${
                        isToday ? "text-indigo-400 font-bold" : "text-slate-200"
                      }`}
                    >
                      {dayName}
                    </span>
                    {formattedDate && (
                      <span className="text-xs font-mono text-slate-400">
                        {formattedDate}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.06]">
                    {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                {/* Task items list */}
                <div className="space-y-2.5">
                  {tasks.map((task) => {
                    const theme =
                      categoryTheme[task.category?.toLowerCase()] ||
                      defaultTheme;
                    const IconComp = theme.icon;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => openEditModal(task)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 group
                                   ${theme.cardBg} ${theme.border} ${theme.glow}
                                   ${task.completed ? "opacity-45" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Complete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskCompleted(task.id);
                            }}
                            className="text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                            )}
                          </button>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-xs font-semibold text-slate-100 truncate ${
                                  task.completed
                                    ? "line-through text-slate-500"
                                    : ""
                                }`}
                              >
                                {task.title}
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText}`}
                              >
                                <IconComp className="w-2.5 h-2.5" />
                                {task.category || "routine"}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Time & Edit trigger */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-semibold tabular-nums text-slate-200 block">
                              {task.startTime}
                            </span>
                            <span className="text-[10px] font-medium tabular-nums text-slate-400 block">
                              {task.duration}m
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Dialog panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-[#0f121b] border border-white/[0.14] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Edit Task
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {editingTask.date || "Today"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTask(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1.5">
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
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      required
                      className="clean-input tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1.5">
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
                      className="clean-input tabular-nums"
                    />
                  </div>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["work", "break", "routine"] as const).map((cat) => {
                      const theme = categoryTheme[cat];
                      const isSelected = editCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditCategory(cat)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                            isSelected
                              ? `${theme.badgeBg} ${theme.badgeText} shadow-md`
                              : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advice preview if present */}
                {editingTask.description && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-indigo-400 font-medium">Pacing Advice:</span>{" "}
                      {editingTask.description}
                    </div>
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
                    className="flex items-center gap-2 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    {editingTask.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                    <span>
                      {editingTask.completed ? "Mark Incomplete" : "Mark Done"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      removeTask(editingTask.id);
                      setEditingTask(null);
                    }}
                    className="text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
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
