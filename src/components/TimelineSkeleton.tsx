"use client";

import { motion } from "framer-motion";

export function TimelineSkeleton() {
  const rows = Array.from({ length: 6 });

  return (
    <div className="flex flex-col h-full w-full rounded-2xl bg-[#0c0c10] border border-white/[0.08] p-5 space-y-4 overflow-hidden relative">
      {/* Header wireframe */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-28 h-4 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="w-16 h-4 rounded-full bg-white/[0.04] animate-pulse" />
      </div>

      {/* Grid lanes wireframe */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        {rows.slice(0, 3).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <div className="w-20 h-3 rounded bg-white/[0.05] animate-pulse mb-2" />
            <div className="h-16 rounded-xl bg-white/[0.04] border border-white/[0.04] animate-pulse" />
            <div className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
            <div className="h-20 rounded-xl bg-white/[0.04] border border-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Subtle shimmer bar */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/[0.04] to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
