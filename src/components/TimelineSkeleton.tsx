"use client";

import { motion } from "framer-motion";

/**
 * Pulsing skeleton loader displayed in the timeline panel
 * while the AI is generating a schedule.
 */
export function TimelineSkeleton() {
  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="flex flex-col gap-4 w-full">
      {skeletonRows.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="flex items-start gap-4"
        >
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center pt-1">
            <div className="w-3 h-3 rounded-full bg-surface-600 animate-pulse" />
            {i < skeletonRows.length - 1 && (
              <div className="w-px h-16 bg-gradient-to-b from-surface-600 to-transparent mt-1" />
            )}
          </div>

          {/* Card skeleton */}
          <div className="flex-1 glass-card p-5 space-y-3">
            {/* Time badge */}
            <div className="h-4 w-20 rounded-md bg-surface-500/50 animate-pulse" />
            {/* Title */}
            <div className="h-5 w-3/4 rounded-md bg-surface-500/40 animate-pulse" />
            {/* Description lines */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-md bg-surface-500/30 animate-pulse" />
              <div className="h-3 w-5/6 rounded-md bg-surface-500/25 animate-pulse" />
            </div>
            {/* Meta row */}
            <div className="flex gap-3 pt-1">
              <div className="h-6 w-16 rounded-full bg-surface-500/30 animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-surface-500/25 animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}

      {/* Shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/[0.03] to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
