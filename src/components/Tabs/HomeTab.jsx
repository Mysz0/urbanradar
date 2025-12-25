import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Radar, Flame, CheckCircle2, Trophy, Zap, Lock, Search, ChevronDown, Check } from 'lucide-react';
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
  spotStreaks = {},
  isDark 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ready'); 
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const selectRef = useRef(null);

  const todayStr = new Date().toDateString();
  const currentSpot = activeSpotId ? spots[activeSpotId] : null;
  
  const distance = (userLocation && currentSpot) 
    ? Math.round(getDistance(userLocation.lat, userLocation.lng, currentSpot.lat, currentSpot.lng))
    : null;

  const personalSpotData = activeSpotId ? spotStreaks?.[activeSpotId] : null;
  const isLoggedToday = personalSpotData?.last_claim && new Date(personalSpotData.last_claim).toDateString() === todayStr;

  const sortOptions = [
    { id: 'ready', label: 'Ready to Sync', icon: Zap },
    { id: 'streak', label: 'Highest Streak', icon: Flame },
    { id: 'points', label: 'Most XP', icon: Trophy },
    { id: 'name', label: 'Alphabetical', icon: Search }
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) setIsSelectOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAndSortedNodes = useMemo(() => {
    return unlockedSpots
      .map(id => {
        const sInfo = spotStreaks[id];
        const isReady = sInfo?.last_claim ? new Date(sInfo.last_claim).toDateString() !== todayStr : true;
        return { id, ...spots[id], streakCount: sInfo?.streak || 0, isReady };
      })
      .filter(node => node.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'ready') return b.isReady - a.isReady;
        if (sortBy === 'streak') return b.streakCount - a.streakCount;
        if (sortBy === 'points') return (b.points || 0) - (a.points || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [unlockedSpots, spots, spotStreaks, searchQuery, sortBy, todayStr]);

  const getNodeRank = (s) => {
    if (s >= 10) return { color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    if (s >= 5) return { color: 'text-slate-300', bg: 'bg-slate-300/10' };
    if (s >= 2) return { color: 'text-orange-400', bg: 'bg-orange-400/10' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* SCANNER SECTION */}
      <div className="flex flex-col gap-3">
        {(isNearSpot && activeSpotId) ? (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            <div className={`flex items-center gap-3 smart-glass p-5 rounded-[2.5rem] border relative overflow-hidden`}>
              <div className={`${isLoggedToday ? 'bg-zinc-800' : canClaim ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-orange-500'} p-2.5 rounded-xl text-white transition-colors`}>
                <Radar size={18} className={isLoggedToday ? "" : "animate-pulse"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isLoggedToday ? 'text-zinc-600' : 'text-emerald-500'}`}>
                  {isLoggedToday ? "Offline" : "Live Signal"}
                </p>
                <p className={`text-xs truncate font-bold uppercase tracking-tight ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>{currentSpot?.name}</p>
              </div>
              
              {distance !== null && !isLoggedToday && (
                <div className="text-right">
                   <p className={`text-[11px] font-black uppercase tracking-tighter ${canClaim ? 'text-emerald-500 animate-pulse' : 'text-orange-500'}`}>
                    {distance}m
                   </p>
                   <p className="text-[7px] font-bold text-zinc-600 uppercase">Range</p>
                </div>
              )}
            </div>

            <button 
              disabled={isLoggedToday || !canClaim}
              onClick={() => claimSpot(activeSpotId)}
              className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase transition-all active:scale-95 border ${
                isLoggedToday 
                  ? 'bg-zinc-900/40 border-white/5 text-zinc-700' 
                  : canClaim 
                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg'
                    : 'bg-zinc-900/60 border-white/10 text-zinc-500 opacity-80'
              }`}
            >
              {isLoggedToday ? (
                <span className="flex items-center justify-center gap-2"><Lock size={16}/> Logged Today</span>
              ) : canClaim ? (
                <span className="flex items-center justify-center gap-2"><Zap size={16} className="fill-current"/> Sync Node</span>
              ) : (
                <span className="flex items-center justify-center gap-2 animate-pulse text-zinc-400 uppercase tracking-widest text-[11px]">
                  Come closer to claim
                </span>
              )}
            </button>
          </div>
        ) : (
          /* SCANNING AREA - EXACT MATCH TO PROFILE IDENTITY BOX */
          <div className={`smart-glass p-10 rounded-[3rem] border relative overflow-hidden group`}>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] animate-pulse" />
             <div className="relative flex flex-col items-center justify-center">
                <div className="relative mb-4">
                  <Radar className={`${isDark ? 'text-zinc-500' : 'text-emerald-600/50'} animate-spin-slow`} size={32} />
                  <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping scale-150 opacity-0 group-hover:opacity-100" />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-[0.4em] animate-pulse ${isDark ? 'text-zinc-500' : 'text-emerald-800/40'}`}>
                  Scanning Environment
                </p>
                <div className="flex gap-1 mt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-emerald-200'} animate-bounce`} style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
             </div>
          </div>
        )}
      </div>

      <StatCard mainVal={totalPoints} subVal={foundCount} colors={colors} />

      {/* SEARCH AND CUSTOM SELECT - USING SMART GLASS */}
      <div className="space-y-3 px-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-600' : 'text-emerald-600/50'}`} size={14} />
            <input 
              type="text"
              placeholder="FILTER LOGS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full smart-glass border rounded-2xl py-4 pl-11 pr-4 text-[10px] font-black focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          <div className="relative" ref={selectRef}>
            <button 
              onClick={() => setIsSelectOpen(!isSelectOpen)}
              className="h-full px-4 smart-glass border rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase active:scale-95 transition-all"
            >
              <span className={isDark ? 'text-zinc-400' : 'text-emerald-800/60'}>{sortBy.toUpperCase()}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : ''} ${isDark ? 'text-zinc-600' : 'text-emerald-600/50'}`} />
            </button>

            {isSelectOpen && (
              <div className={`absolute right-0 mt-2 w-48 border rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-emerald-100'}`}>
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setIsSelectOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-emerald-50 text-emerald-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={14} className={sortBy === opt.id ? 'text-emerald-500' : 'opacity-40'} />
                      <span className="text-[10px] font-black uppercase">
                        {opt.label}
                      </span>
                    </div>
                    {sortBy === opt.id && <Check size={14} className="text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NODES LIST - USING SMART GLASS */}
        <div className="grid gap-3 pb-24 pt-2">
          {filteredAndSortedNodes.length === 0 ? (
            <div className={`p-10 text-center text-[10px] uppercase font-bold opacity-20 tracking-[0.2em] ${isDark ? 'text-white' : 'text-emerald-900'}`}>
              No encrypted logs found
            </div>
          ) : (
            filteredAndSortedNodes.map(node => {
              const rank = getNodeRank(node.streakCount);
              return (
                <div key={node.id} className="relative group transition-all">
                  {node.isReady && (
                    <div className="absolute -left-1 top-4 bottom-4 w-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_10px_#10b981]" />
                  )}
                  <div className={`smart-glass border p-5 rounded-[2.2rem] flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${rank.bg} ${rank.color}`}>
                        {node.streakCount >= 10 ? <Trophy size={18} /> : node.streakCount > 1 ? <Flame size={18} fill="currentColor" /> : <CheckCircle2 size={18} />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{node.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${node.isReady ? 'text-emerald-500' : (isDark ? 'text-zinc-600' : 'text-emerald-800/30')}`}>
                            {node.isReady ? 'Sync Required' : 'Secured'}
                          </span>
                          {node.streakCount > 1 && <span className={`text-[9px] font-bold ${isDark ? 'text-zinc-500' : 'text-emerald-800/40'}`}>• STREAK {node.streakCount}x</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-black ${isDark ? 'text-zinc-400' : 'text-emerald-700'}`}>+{node.points}XP</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
