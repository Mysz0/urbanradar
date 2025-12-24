import React from 'react';
import { Radar, Zap, Clock, TrendingUp } from 'lucide-react';
import StatCard from '../Shared/StatCard';

export default function HomeTab({ 
  isNearSpot, 
  totalPoints, 
  foundCount, 
  unlockedSpots, 
  visitData, // Received from updated App.jsx
  spots, 
  colors 
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 1. PROXIMITY ALERT */}
      {isNearSpot && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl animate-in zoom-in-95 duration-500">
          <div className="bg-emerald-500 p-2 rounded-xl text-white animate-pulse">
            <Radar size={16} />
          </div>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
            Signal Detected Nearby!
          </p>
        </div>
      )}

      {/* 2. OVERALL STATS */}
      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      {/* 3. ACTIVE STREAKS / COLLECTIONS */}
      <div className="space-y-4">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50 px-4">
          Active Nodes & Streaks
        </h2>
        
        {unlockedSpots.length === 0 ? (
          <div className={`${colors.card} p-10 rounded-[2.5rem] text-center border border-dashed border-zinc-500/20`}>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No active nodes detected</p>
          </div>
        ) : (
          unlockedSpots.map(id => {
            const spot = spots[id];
            const data = visitData[id] || { streak: 0, lastVisit: null };
            const canCheckIn = data.lastVisit !== today;
            const multiplier = (1 + (data.streak * 0.1)).toFixed(1);

            return (
              <div key={id} className={`group relative ${colors.card} p-5 rounded-[2.2rem] border transition-all duration-300 hover:scale-[1.02] backdrop-blur-md overflow-hidden`}>
                {/* Background Multiplier Glow */}
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <TrendingUp size={100} />
                </div>

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-colors ${canCheckIn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      {canCheckIn ? <Zap size={20} fill="currentColor"/> : <Clock size={20}/>}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spot?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          {data.streak} Day Streak
                        </span>
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          {multiplier}x Multiplier
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs font-black tracking-tighter">
                      +{Math.round(spot?.points * parseFloat(multiplier))}
                    </p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                      Daily Yield
                    </p>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                      Check-in Availability
                    </span>
                    <span className={`text-[8px] font-black uppercase ${canCheckIn ? 'text-emerald-500' : 'text-zinc-500'}`}>
                      {canCheckIn ? 'Ready to Sync' : 'Recharging...'}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${canCheckIn ? 'w-full bg-emerald-500' : 'w-1/2 bg-zinc-700'}`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
