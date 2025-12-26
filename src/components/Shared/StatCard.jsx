import React from 'react';
import { Flame } from 'lucide-react';

export default function StatCard({ mainVal, subVal, streak = 0, colors }) {
  return (
    <div className={`${colors.card} backdrop-blur-2xl rounded-[3rem] p-8 border border-white/5 flex justify-between items-center transition-all duration-700 shadow-2xl`}>
      {/* XP Section */}
      <div className="flex-1">
        <p className="text-5xl font-bold tracking-tighter leading-none">
          {mainVal.toLocaleString()}
        </p>
        <p className="text-[9px] font-black text-[rgb(var(--theme-primary))] uppercase tracking-[0.2em] mt-3 opacity-80">
          Total XP
        </p>
      </div>

      {/* Divider 1 */}
      <div className="h-10 w-px bg-white/5 mx-4" />

      {/* Nodes Section */}
      <div className="text-center px-2">
        <p className="text-2xl font-bold leading-none tracking-tight">
          {subVal}
        </p>
        <p className="text-zinc-500 text-[8px] font-black uppercase mt-2 tracking-widest whitespace-nowrap">
          Nodes
        </p>
      </div>

      {/* Divider 2 */}
      <div className="h-10 w-px bg-white/5 mx-4" />

      {/* STREAK Section - The New Home */}
      <div className="text-right flex-1 flex flex-col items-end">
        <div className="flex items-center gap-1.5">
          <p className="text-2xl font-bold leading-none tracking-tight text-orange-500">
            {streak}
          </p>
          <Flame size={16} className="text-orange-500 fill-orange-500/20" />
        </div>
        <p className="text-orange-500/50 text-[8px] font-black uppercase mt-2 tracking-widest">
          Day Streak
        </p>
      </div>
    </div>
  );
}
