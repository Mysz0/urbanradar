import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Radar, Flame, CheckCircle2, Trophy, Zap, Lock, Search, ChevronDown, Check, X, Info } from 'lucide-react';
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
  streak,
  spotStreaks = {},
  isDark,
  onScanningTap
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ready'); 
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const selectRef = useRef(null);

  const todayStr = new Date().toDateString();
  const currentSpot = activeSpotId ? spots[activeSpotId] : null;
  
  const distance = (userLocation && currentSpot) 
    ? Math.round(getDistance(userLocation.lat, userLocation.lng, currentSpot.lat, currentSpot.lng))
    : null;

  const isLoggedToday = useMemo(() => {
    if (!activeSpotId) return false;
    const personalData = spotStreaks[activeSpotId];
    return personalData?.last_claim && new Date(personalData.last_claim).toDateString() === todayStr;
  }, [spotStreaks, activeSpotId, todayStr]);

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
      .filter(id => spots[id])
      .map(id => {
        const sInfo = spotStreaks[id];
        const isReady = sInfo?.last_claim 
          ? new Date(sInfo.last_claim).toDateString() !== todayStr 
          : true;

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
    return { color: 'text-[rgb(var(--theme-primary))]', bg: 'bg-[rgb(var(--theme-primary))]/10' };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* NODE DESCRIPTION MODAL */}
      {selectedNode && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSelectedNode(null)}
        >
          <div 
            className="smart-glass border rounded-3xl max-w-md w-full p-6 animate-in fade-in zoom-in-90 slide-in-from-top-2 duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={18} className="opacity-50" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getNodeRank(selectedNode.streakCount).bg} ${getNodeRank(selectedNode.streakCount).color}`}>
                {selectedNode.streakCount >= 10 ? <Trophy size={20} /> : selectedNode.streakCount > 1 ? <Flame size={20} fill="currentColor" /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight mb-1">{selectedNode.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[rgb(var(--theme-primary))]">
                    +{selectedNode.points}XP
                  </span>
                  {selectedNode.streakCount > 1 && (
                    <span className="text-[10px] font-bold opacity-40">
                      • {selectedNode.streakCount}x Streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedNode.description ? (
              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="opacity-50" />
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-50">Node Intel</span>
                </div>
                <p className="text-sm leading-relaxed opacity-80">
                  {selectedNode.description}
                </p>
              </div>
            ) : (
              <div className="mt-4 p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider opacity-30">
                  No intel available for this node
                </p>
              </div>
            )}

            <div className={`mt-4 p-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-wider ${
              selectedNode.isReady ? 'bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))]' : 'bg-white/5 opacity-40'
            }`}>
              {selectedNode.isReady ? 'Sync Required' : 'Secured'}
            </div>
          </div>
        </div>
      )}

      {/* SCANNER SECTION (ONLY PLACE TO CLAIM) */}
      <div className="flex flex-col gap-3">
        {(isNearSpot && activeSpotId && currentSpot) ? (
          <div className="flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3 smart-glass p-5 rounded-[2.5rem] border relative overflow-hidden">
              <div className={`${
                isLoggedToday 
                  ? 'bg-zinc-800' 
                  : canClaim 
                    ? 'bg-[rgb(var(--theme-primary))] shadow-[0_0_20px_var(--theme-primary-glow)]' 
                    : 'bg-orange-500'
              } p-2.5 rounded-xl text-white transition-colors`}>
                <Radar size={18} className={isLoggedToday ? "" : "animate-pulse"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isLoggedToday ? 'opacity-40' : 'text-[rgb(var(--theme-primary))]'}`}>
                  {isLoggedToday ? "Offline" : "Live Signal"}
                </p>
                <p className="text-xs truncate font-bold uppercase tracking-tight">
                  {currentSpot?.name}
                </p>
              </div>
              
              {distance !== null && !isLoggedToday && (
                <div className="text-right">
                  <p className={`text-[11px] font-black uppercase tracking-tighter ${
                    canClaim ? 'text-[rgb(var(--theme-primary))]' : 'opacity-50'
                  }`}>
                    {distance}m
                  </p>
                  <p className="text-[7px] font-bold uppercase opacity-50">
                    Range
                  </p>
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
                    ? 'bg-[rgb(var(--theme-primary))] border-white/20 text-zinc-950 shadow-lg'
                    : 'bg-zinc-900/60 border-white/10 text-zinc-400 opacity-80'
              }`}
            >
              {isLoggedToday ? (
                <span className="flex items-center justify-center gap-2"><Lock size={16}/> Logged Today</span>
              ) : canClaim ? (
                <span className="flex items-center justify-center gap-2"><Zap size={16} className="fill-current"/> Sync Node</span>
              ) : (
                <span className="flex items-center justify-center gap-2 animate-pulse text-[11px] tracking-widest opacity-50">
                  Come closer to claim
                </span>
              )}
            </button>
          </div>
        ) : (
          <div onClick={onScanningTap} className="smart-glass p-10 rounded-[3rem] border relative overflow-hidden group">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--theme-primary),0.1)_0%,transparent_70%)] animate-pulse" />
             <div className="relative flex flex-col items-center justify-center">
                <div className="relative mb-4">
                  <Radar className="text-[rgb(var(--theme-primary))] opacity-50 animate-spin-slow" size={32} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse opacity-40">
                  Scanning Environment
                </p>
             </div>
          </div>
        )}
      </div>

      <StatCard 
        mainVal={totalPoints} 
        subVal={foundCount} 
        streak={streak} 
        label="Global Assets"
      />

      {/* SEARCH AND NODES LIST (READ ONLY) */}
      <div className="space-y-3 px-1">
        <div className="flex gap-2 h-14 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={14} />
            <input 
              type="text"
              placeholder="FILTER NODES..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full smart-glass border rounded-2xl pl-11 pr-4 text-[10px] font-black focus:outline-none focus:border-[rgb(var(--theme-primary))]/50 transition-all uppercase placeholder:opacity-30"
            />
          </div>

          <div className="relative w-[120px] flex-shrink-0" ref={selectRef}>
            <button 
              onClick={() => setIsSelectOpen(!isSelectOpen)}
              className="w-full h-full px-2 smart-glass border rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase active:scale-95 transition-all"
            >
              <span className="opacity-50 truncate">{sortBy.toUpperCase()}</span>
              <ChevronDown size={12} className={`flex-shrink-0 transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSelectOpen && (
              <div className="absolute right-0 mt-2 w-48 border rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200 smart-glass overflow-hidden border-white/10">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setIsSelectOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[rgba(var(--theme-primary),0.05)]"
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={14} className={sortBy === opt.id ? 'text-[rgb(var(--theme-primary))]' : 'opacity-40'} />
                      <span className="text-[10px] font-black uppercase tracking-tight">
                        {opt.label}
                      </span>
                    </div>
                    {sortBy === opt.id && <Check size={14} className="text-[rgb(var(--theme-primary))]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 pb-24 pt-2">
          {filteredAndSortedNodes.length === 0 ? (
            <div className="p-10 text-center text-[10px] uppercase font-bold opacity-20 tracking-[0.2em]">
              No localized signals found
            </div>
          ) : (
            filteredAndSortedNodes.map(node => {
              const rank = getNodeRank(node.streakCount);
              return (
                <div key={node.id} className="relative group">
                  {node.isReady && (
                    <div className="absolute -left-1 top-4 bottom-4 w-1 bg-[rgb(var(--theme-primary))] rounded-full z-10 shadow-[0_0_10px_var(--theme-primary-glow)]" />
                  )}
                  
                  <div 
                    onClick={() => setSelectedNode(node)}
                    className="node-card-static p-5 flex items-center justify-between transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${rank.bg} ${rank.color}`}>
                        {node.streakCount >= 10 ? <Trophy size={18} /> : node.streakCount > 1 ? <Flame size={18} fill="currentColor" /> : <CheckCircle2 size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-bold text-sm leading-none tracking-tight">
                          {node.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors duration-500 ${
                            node.isReady ? 'text-[rgb(var(--theme-primary))]' : 'opacity-40'
                          }`}>
                            {node.isReady ? 'Sync Required' : 'Secured'}
                          </span>
                          {node.streakCount > 1 && (
                            <span className="text-[9px] font-bold opacity-40">
                              • {node.streakCount}x Streak
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <p className="text-[11px] font-black group-hover:text-[rgb(var(--theme-primary))] transition-colors duration-300">
                        +{node.points}XP
                      </p>
                      <Info size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
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
