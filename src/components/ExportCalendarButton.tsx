"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Check, X } from "lucide-react";
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
      {/* ── Minimalist Export Button ── */}
      <motion.button
        id="export-calendar-btn"
        onClick={handleExport}
        disabled={timelineData.length === 0 || isExporting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                   bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white
                   border border-white/[0.08] hover:border-white/[0.16]
                   transition-all duration-150 shadow-sm
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Calendar className="w-3.5 h-3.5 text-violet-400" />
        <span>Export .ics</span>
      </motion.button>

      {/* ── Modern Toast Notification ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3
                       px-4 py-3 rounded-xl bg-[#121218]/95
                       border border-white/[0.12] shadow-2xl backdrop-blur-xl"
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="flex flex-col pr-1">
              <span className="text-xs font-medium text-zinc-100">
                Schedule Exported
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                allili-schedule.ics
              </span>
            </div>

            <button
              onClick={() => setShowToast(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
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
