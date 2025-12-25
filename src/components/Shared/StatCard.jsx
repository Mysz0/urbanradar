import React from 'react';

export default function StatCard({ mainVal, subVal, colors }) {
  return (
    <div className={`${colors.card} backdrop-blur-2xl rounded-[3rem] p-10 border border-white/5 flex justify-between items-center transition-all duration-700`}>
      <div>
        <p className="text-6xl font-bold tracking-tighter leading-none">
          {mainVal.toLocaleString()}
        </p>
        <p className="text-[10px] font-bold text-[rgb(var(--theme-primary))] uppercase tracking-[0.2em] mt-4 transition-colors duration-500">
          Experience Points
        </p>
      </div>

      {/* Dynamic Divider */}
      <div className="h-12 w-px bg-[rgb(var(--theme-primary))]/10 mx-4" />

      <div className="text-right">
        <p className="text-3xl font-bold leading-none tracking-tight">
          {subVal}
        </p>
        <p className="text-zinc-500 text-[10px] font-bold uppercase mt-2 tracking-widest">
          Nodes Found
        </p>
      </div>
    </div>
  );
}
