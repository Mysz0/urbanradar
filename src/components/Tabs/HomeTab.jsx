import React from 'react';
import { Radar, Flame, CheckCircle2, MapPin, Zap, Lock } from 'lucide-react';
import StatCard from '../Shared/StatCard';

export default function HomeTab({ 
  isNearSpot, 
  activeSpotId, 
  claimSpot, 
  totalPoints, 
  foundCount, 
  unlockedSpots, 
  spots, 
  colors, 
  streak,
  spotStreaks // Make sure this is passed from App.jsx
}) {
  const currentSpot = spots[activeSpotId];
  
  // FIXED: Check personal streak data for today's claim
  const personalSpotData = spotStreaks?.[activeSpotId];
  const lastClaimDate = personalSpotData?.last_claim ? new Date(personalSpotData.last_claim).toDateString() : null;
  const isLoggedToday = lastClaimDate === new Date().toDateString();
  
  const isGlobalStreakActive = streak > 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-3">
        {isNearSpot && (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3 bg-zinc-500/5 border border-white/5 p-4 rounded-3xl">
              <div className={`${isLoggedToday ? 'bg-zinc-800' : 'bg-emerald-500'} p-2 rounded-xl text-white transition-colors`}>
                <Radar size={16} className={isLoggedToday ? "" : "animate-pulse"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isLoggedToday ? 'text-zinc-600' : 'text-emerald-500'}`}>
                  {isLoggedToday ? "Signal Offline" : "Target in Range"}
                </p>
                <p className="text-xs text-zinc-400 truncate font-bold uppercase tracking-tight">
                  {currentSpot?.name || 'Unknown Location'}
                </p>
              </div>
            </div>

            <button 
              disabled={isLoggedToday}
              onClick={() => claimSpot(activeSpotId)}
              className={`group relative w-full py-4 rounded-[2rem] font-black text-sm uppercase tracking-tight transition-all flex items-center justify-center gap-2 active:scale-95 border ${
                isLoggedToday 
                  ? 'bg-zinc-900/40 border-white/5 text-zinc-700 cursor-not-allowed' 
                  : 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isLoggedToday ? (
                <>
                  <Lock size={16} className="opacity-40" />
                  <span>Logged Today</span>
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  <span>Claim Point</span>
                  <Zap size={14} className="fill-current" />
                </>
              )}
            </button>
          </div>
        )}

        {/* GLOBAL STREAK */}
        <div className={`flex items-center gap-3 ${colors.card} p-4 rounded-3xl border transition-all duration-500 ${isGlobalStreakActive ? 'border-orange-500/30' : 'border-white/5'}`}>
          <div className={`${isGlobalStreakActive ? 'text-orange-500' : 'text-zinc-500'}`}>
            <Flame size={20} className={isGlobalStreakActive ? "animate-bounce" : ""} />
          </div>
          <div>
            <p className={`text-sm font-black leading-none ${isGlobalStreakActive ? 'text-orange-500' : colors.text}`}>
              {streak || 0} Day Activity
            </p>
            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Global Streak</p>
          </div>
        </div>
      </div>

      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      {/* COLLECTIONS LIST */}
      <div className="space-y-3">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 px-4">Your Nodes</h2>

        {unlockedSpots.length === 0 ? (
          <div className="p-10 text-center text-[10px] uppercase font-bold opacity-20">No logs found</div>
        ) : (
          <div className="grid gap-3 pb-8">
            {[...unlockedSpots].reverse().map(id => {
              const spot = spots[id];
              // FIXED: Get streak for THIS specific spot
              const spotStreak = spotStreaks?.[id]?.streak || 0;
              const isHot = spotStreak > 1;

              return (
                <div key={id} className={`${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border border-white/5 transition-transform active:scale-[0.98]`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isHot ? 'bg-orange-500/10 text-orange-500 shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isHot ? <Flame size={18} fill={isHot ? "currentColor" : "none"} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spot?.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Logged</span>
                        {isHot && (
                          <span className="text-[9px] text-orange-500 font-black uppercase flex items-center gap-0.5">
                            <span className="w-1 h-1 bg-orange-500 rounded-full" />
                            {spotStreak}x Streak
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black">+{spot?.points || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
