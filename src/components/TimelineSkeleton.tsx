"use client";

import { motion } from "framer-motion";

export function TimelineSkeleton() {
  const lanes = [
    { name: "Today", tag: "Day 1" },
    { name: "Tomorrow", tag: "Day 2" },
    { name: "Next Day", tag: "Day 3" },
  ];

  return (
    <div className="flex flex-col h-full w-full rounded-2xl bg-[#080b11]/90 border border-white/[0.08] p-5 space-y-4 overflow-hidden relative shadow-2xl backdrop-blur-xl">
      {/* Header wireframe */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-md bg-indigo-500/20 animate-pulse" />
          <div className="w-32 h-4 rounded-md bg-white/[0.06] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] animate-pulse" />
          <div className="w-16 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Grid lanes wireframe with cyber-luxe glowing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
        {lanes.map((lane, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.05]"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-16 h-3 rounded bg-white/[0.07] animate-pulse" />
              <div className="w-10 h-3 rounded bg-white/[0.04] animate-pulse" />
            </div>

            {/* Deep work block mock */}
            <div className="h-20 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-purple-500/10 border border-indigo-500/20 animate-pulse p-2.5 flex flex-col justify-between">
              <div className="w-3/4 h-2.5 rounded bg-indigo-400/20" />
              <div className="w-1/2 h-2 rounded bg-indigo-400/15" />
            </div>

            {/* Break block mock */}
            <div className="h-14 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 animate-pulse p-2.5 flex flex-col justify-between">
              <div className="w-1/2 h-2.5 rounded bg-emerald-400/25" />
              <div className="w-1/3 h-2 rounded bg-emerald-400/15" />
            </div>

            {/* Routine block mock */}
            <div className="h-24 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-500/20 animate-pulse p-2.5 flex flex-col justify-between">
              <div className="w-4/5 h-2.5 rounded bg-amber-400/20" />
              <div className="w-2/3 h-2 rounded bg-amber-400/15" />
            </div>
          </div>
        ))}
      </div>

      {/* Iridescent shimmer wave */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/[0.06] to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
