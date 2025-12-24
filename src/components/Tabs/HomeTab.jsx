import React from 'react';
import { Radar, Flame, CheckCircle2, MapPin, Zap, Lock, Search, Trophy } from 'lucide-react';
import StatCard from '../Shared/StatCard';
import { getDistance } from '../../utils/geoUtils';

export default function HomeTab({ 
  isNearSpot, 
  canClaim, 
  userLocation, 
  activeSpotId, 
  claimSpot, 
  totalPoints, 
  foundCount, 
  unlockedSpots = [], 
  spots = {}, 
  colors, 
  streak,
  spotStreaks = {}
}) {
  const currentSpot = activeSpotId ? spots[activeSpotId] : null;
  
  const distance = (userLocation && currentSpot) 
    ? Math.round(getDistance(userLocation.lat, userLocation.lng, currentSpot.lat, currentSpot.lng))
    : null;

  const personalSpotData = activeSpotId ? spotStreaks?.[activeSpotId] : null;
  const lastClaimDate = personalSpotData?.last_claim ? new Date(personalSpotData.last_claim).toDateString() : null;
  const isLoggedToday = lastClaimDate === new Date().toDateString();
  const isGlobalStreakActive = (streak || 0) > 1;

  // Function to get the color/rank of a specific node streak
  const getNodeRank = (s) => {
    if (s >= 10) return { color: 'text-yellow-400', label: 'Gold Mastery', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
    if (s >= 5) return { color: 'text-slate-300', label: 'Silver Tier', bg: 'bg-slate-300/10', border: 'border-slate-300/20' };
    if (s >= 2) return { color: 'text-orange-400', label: 'Bronze Tier', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* HEADER / CLAIM SECTION */}
      <div className="flex flex-col gap-3">
        {(isNearSpot && activeSpotId) ? (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            
            {/* ACTIVE NODE INFO */}
            <div className={`flex items-center gap-3 ${colors?.card || 'bg-zinc-900'} border border-white/5 p-4 rounded-3xl relative overflow-hidden`}>
              
              {/* Node Streak Badge (smol icon next to name) */}
              {personalSpotData?.streak > 1 && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  <MapPin size={8} className="text-emerald-500" />
                  <span className="text-[8px] font-black text-white/50">{personalSpotData.streak}x</span>
                </div>
              )}

              {distance !== null && !isLoggedToday && (
                <div className={`absolute bottom-4 right-4 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter transition-all ${
                  canClaim 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 animate-pulse' 
                    : 'bg-zinc-500/10 border-white/10 text-zinc-500'
                }`}>
                  {distance}m
                </div>
              )}

              <div className={`${isLoggedToday ? 'bg-zinc-800' : canClaim ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-orange-500'} p-2 rounded-xl text-white transition-all duration-500`}>
                <Radar size={16} className={isLoggedToday ? "" : "animate-pulse"} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${
                  isLoggedToday ? 'text-zinc-600' : canClaim ? 'text-emerald-500' : 'text-orange-500'
                }`}>
                  {isLoggedToday ? "Signal Offline" : canClaim ? "Ready to Sync" : "Approaching Node"}
                </p>
                <p className="text-xs text-zinc-400 truncate font-bold uppercase tracking-tight">
                  {currentSpot?.name || 'Locating Node...'}
                </p>
              </div>
            </div>

            <button 
              disabled={isLoggedToday || !canClaim}
              onClick={() => claimSpot(activeSpotId)}
              className={`group relative w-full py-4 rounded-[2rem] font-black text-sm uppercase tracking-tight transition-all flex items-center justify-center gap-2 active:scale-95 border ${
                isLoggedToday 
                  ? 'bg-zinc-900/40 border-white/5 text-zinc-700 cursor-not-allowed' 
                  : canClaim 
                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-500 cursor-not-allowed grayscale'
              }`}
            >
              {isLoggedToday ? (
                <>
                  <Lock size={16} className="opacity-40" />
                  <span>Logged Today</span>
                </>
              ) : canClaim ? (
                <>
                  <MapPin size={18} />
                  <span>Claim Point</span>
                  <Zap size={14} className="fill-current" />
                </>
              ) : (
                <>
                  <Radar size={16} className="animate-spin-slow" />
                  <span>Move Closer ({distance}m)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border border-white/5 ${colors?.card || 'bg-zinc-900'} opacity-60`}>
             <div className="relative mb-4">
                <Search className="text-zinc-500 animate-pulse" size={32} />
                <div className="absolute inset-0 border-2 border-zinc-500/20 rounded-full animate-ping" />
             </div>
             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Scanning Area</p>
             <p className="text-[8px] font-bold text-zinc-600 uppercase mt-1">No active nodes in range</p>
          </div>
        )}

        {/* GLOBAL STREAK */}
        <div className={`flex items-center gap-3 ${colors?.card || 'bg-zinc-900'} p-4 rounded-3xl border transition-all duration-500 ${isGlobalStreakActive ? 'border-orange-500/30' : 'border-white/5'}`}>
          <div className={`${isGlobalStreakActive ? 'text-orange-500 flame-glow' : 'text-zinc-500'}`}>
            <Flame size={20} className={isGlobalStreakActive ? "animate-bounce" : ""} />
          </div>
          <div>
            <p className={`text-sm font-black leading-none ${isGlobalStreakActive ? 'text-orange-500' : colors?.text || 'text-white'}`}>
              {streak || 0} Day Activity
            </p>
            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-1">Global Streak</p>
          </div>
        </div>
      </div>

      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      {/* COLLECTIONS LIST */}
      <div className="space-y-3">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 px-4">Your Nodes</h2>

        {(!unlockedSpots || unlockedSpots.length === 0) ? (
          <div className="p-10 text-center text-[10px] uppercase font-bold opacity-20">No logs found</div>
        ) : (
          <div className="grid gap-3 pb-8">
            {[...unlockedSpots].reverse().map(id => {
              const spot = spots[id];
              const sCount = spotStreaks?.[id]?.streak || 0;
              const rank = getNodeRank(sCount);

              return (
                <div key={id} className={`${colors?.card || 'bg-zinc-900'} p-5 rounded-[2.2rem] flex items-center justify-between border border-white/5 transition-transform active:scale-[0.98]`}>
                  <div className="flex items-center gap-4">
                    {/* Mastery Icon Logic */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${rank ? rank.bg + ' ' + rank.color : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {sCount >= 10 ? <Trophy size={18} /> : sCount > 1 ? <Flame size={18} fill="currentColor" /> : <CheckCircle2 size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spot?.name || 'Unknown Node'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Logged</span>
                        {sCount > 1 && (
                          <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${rank?.color || 'text-orange-500'}`}>
                            <MapPin size={8} />
                            {sCount}x Node Streak
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
