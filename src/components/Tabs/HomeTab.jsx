import React from 'react';
import { Radar, Zap, Clock, TrendingUp } from 'lucide-react';
import StatCard from '../Shared/StatCard';

export default function HomeTab({ isNearSpot, totalPoints, foundCount, unlockedSpots, visitData, spots, colors }) {
  const today = new Date().toISOString().split('T')[0];

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
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50 px-4">Collections & Streaks</h2>
        
        {/* CRASH PROTECTION: Ensure unlockedSpots is an array before mapping */}
        {Array.isArray(unlockedSpots) && unlockedSpots.map(id => {
          const spot = spots?.[id];
          if (!spot) return null; // Skip if spot data is missing

          const data = (visitData && visitData[id]) ? visitData[id] : { streak: 0, lastVisit: null };
          const canCheckIn = data.lastVisit !== today;
          const streakVal = data.streak || 0;
          const multiplier = (1 + (streakVal * 0.1)).toFixed(1);

          return (
            <div key={id} className={`group relative ${colors.card} p-5 rounded-[2.2rem] border transition-all duration-300 hover:scale-[1.02] backdrop-blur-md overflow-hidden`}>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${canCheckIn ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {canCheckIn ? <Zap size={16} fill="currentColor"/> : '✓'}
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{spot.name}</p>
                    <div className="flex gap-2">
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">{streakVal}D Streak</p>
                      <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">{multiplier}x</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold opacity-30">
                  +{Math.round(spot.points * parseFloat(multiplier))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
