import React from 'react';
import { Radar } from 'lucide-react';
import StatCard from '../Shared/StatCard';

export default function HomeTab({ isNearSpot, totalPoints, foundCount, unlockedSpots, spots, colors }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {isNearSpot && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl animate-in zoom-in-95 duration-500">
          <div className="bg-emerald-500 p-2 rounded-xl text-white animate-pulse"><Radar size={16} /></div>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Signal Detected Nearby!</p>
        </div>
      )}

      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      <div className="space-y-3">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50 px-4">Collections</h2>
        {unlockedSpots.map(id => (
          <div key={id} className={`collection-card ${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border transition-all duration-300 hover:scale-[1.02] backdrop-blur-md`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center font-bold">✓</div>
              <div>
                <p className="font-bold text-sm tracking-tight">{spots[id]?.name}</p>
                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Entry Logged</p>
              </div>
            </div>
            <div className="text-xs font-bold opacity-30">+{spots[id]?.points}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
