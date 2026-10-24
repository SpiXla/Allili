"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, X } from "lucide-react";
import { useScheduleStore } from "@/store/useScheduleStore";
import { downloadIcsFile } from "@/utils/exportIcs";

export function ExportCalendarButton() {
  const timelineData = useScheduleStore((s) => s.timelineData);
  const [showToast, setShowToast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (timelineData.length === 0) return;

    setIsExporting(true);
    try {
      downloadIcsFile(timelineData, "allili-schedule.ics");
      setShowToast(true);

      // Auto dismiss toast after 3.5 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3500);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* ── Export Button ── */}
      <motion.button
        id="export-calendar-btn"
        onClick={handleExport}
        disabled={timelineData.length === 0 || isExporting}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium
                   bg-surface-200/90 hover:bg-surface-300/80
                   border border-accent/30 hover:border-accent/60
                   text-foreground transition-all duration-200
                   shadow-sm hover:shadow-glow/20
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Calendar className="w-3.5 h-3.5 text-accent" />
        <span>Export to Calendar</span>
      </motion.button>

      {/* ── Success Toast Notification ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5
                       px-4 py-3 rounded-2xl glass-card
                       border border-emerald-500/30 bg-surface-200/95
                       shadow-glow-blue/20 backdrop-blur-2xl"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">
                Calendar Exported!
              </span>
              <span className="text-[11px] text-muted">
                Downloaded{" "}
                <span className="text-emerald-400 font-mono">
                  allili-schedule.ics
                </span>
              </span>
            </div>

            <button
              onClick={() => setShowToast(false)}
              className="ml-2 text-muted hover:text-foreground transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
