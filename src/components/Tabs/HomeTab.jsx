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
  streak 
}) {
  const currentSpot = spots[activeSpotId];
  
  // Check if this specific spot was already claimed TODAY
  const lastVisitDate = currentSpot?.last_visit ? new Date(currentSpot.last_visit).toDateString() : null;
  const isLoggedToday = lastVisitDate === new Date().toDateString();
  const isStreakActive = streak > 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-3">
        {isNearSpot && (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            {/* Signal Banner */}
            <div className="flex items-center gap-3 bg-zinc-500/5 border border-white/5 p-4 rounded-3xl">
              <div className={`${isLoggedToday ? 'bg-zinc-700' : 'bg-emerald-500'} p-2 rounded-xl text-white transition-colors`}>
                <Radar size={16} className={isLoggedToday ? "" : "animate-pulse"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-widest leading-none mb-1 ${isLoggedToday ? 'text-zinc-500' : 'text-emerald-500'}`}>
                  {isLoggedToday ? "Signal Logged" : "Target in Range"}
                </p>
                <p className="text-[10px] text-zinc-500 truncate font-medium uppercase">
                  {currentSpot?.name || 'Unknown Location'}
                </p>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <button 
              disabled={isLoggedToday}
              onClick={() => claimSpot(activeSpotId)}
              className={`group relative w-full py-4 rounded-[2rem] font-black text-sm uppercase tracking-tight transition-all flex items-center justify-center gap-2 active:scale-95 border ${
                isLoggedToday 
                  ? 'bg-zinc-900/50 border-white/5 text-zinc-600 cursor-not-allowed' 
                  : 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isLoggedToday ? (
                <>
                  <Lock size={18} />
                  <span>Locked for 24h</span>
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

        {/* GLOBAL STREAK CARD */}
        <div className="flex gap-3">
          <div className={`flex-[1.5] flex items-center gap-3 ${colors.card} p-4 rounded-3xl border transition-all duration-500 ${isStreakActive ? 'border-orange-500/30' : 'border-white/5'}`}>
            <div className={`${isStreakActive ? 'text-orange-500' : 'text-zinc-500'}`}>
              <Flame size={20} className={isStreakActive ? "animate-bounce" : ""} />
            </div>
            <div>
              <p className={`text-sm font-black leading-none ${isStreakActive ? 'text-orange-500' : colors.text}`}>
                {streak || 0} Day Streak
              </p>
              <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Global Activity</p>
            </div>
          </div>
        </div>
      </div>

      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      {/* COLLECTIONS LIST */}
      <div className="space-y-3">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 px-4">
          Collection
        </h2>

        {unlockedSpots.length === 0 ? (
          <div className="p-12 text-center opacity-30">No logs found.</div>
        ) : (
          <div className="grid gap-3 pb-8">
            {[...unlockedSpots].reverse().map(id => {
              const spot = spots[id];
              const isSpotHot = (spot?.streak || 0) > 1; // Assuming you store streak per spot

              return (
                <div key={id} className={`${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border border-white/5`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isSpotHot ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isSpotHot ? <Flame size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spot?.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                          Logged
                        </span>
                        {isSpotHot && (
                          <span className="text-[9px] text-orange-500 font-black uppercase">
                            • {spot.streak}x Streak
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs font-black">+{spot?.points || 0}</div>
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
