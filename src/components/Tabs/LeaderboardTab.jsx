import React, { useState } from 'react';
import { Flame, Users, MapPin, ChevronUp, ChevronDown } from 'lucide-react';

export default function LeaderboardTab({ leaderboard, username, spots = {}, isDark }) {
  const [view, setView] = useState('players');

  const sortedNodes = Object.values(spots).sort((a, b) => {
    const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
    const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      {/* View Switcher */}
      <div className={`flex p-1.5 rounded-[2rem] border mx-4 transition-all duration-500 ${
        isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-black/5 border-black/5'
      }`}>
        <button
          onClick={() => setView('players')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1.6rem] transition-all duration-300 ${
            view === 'players' 
              ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg font-black' 
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <Users size={14} />
          <span className="text-[10px] uppercase tracking-widest">Players</span>
        </button>
        <button
          onClick={() => setView('nodes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1.6rem] transition-all duration-300 ${
            view === 'nodes' 
              ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg font-black' 
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <MapPin size={14} />
          <span className="text-[10px] uppercase tracking-widest">Nodes</span>
        </button>
      </div>

      <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-[rgb(var(--theme-primary))]/50 px-4">
        {view === 'players' ? 'Global Rankings' : 'Top Rated Nodes'}
      </h2>

      {view === 'players' ? (
        leaderboard.map((entry, index) => {
          const isCurrentUser = entry.username === username;
          return (
            <div 
              key={index} 
              className={`node-card-animate group smart-glass p-5 rounded-[2.2rem] flex items-center justify-between border transition-all duration-500 ${
                isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-white border-zinc-100 shadow-sm'
              } ${isCurrentUser ? 'ring-1 ring-[rgb(var(--theme-primary))]/30' : ''} hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-transform duration-500 group-hover:scale-110 ${
                  index === 0 
                    ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg shadow-[var(--theme-primary-glow)]' 
                    : 'bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))]'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className={`font-bold text-sm leading-none tracking-tight transition-colors duration-500 ${isCurrentUser ? 'text-[rgb(var(--theme-primary))]' : ''}`}>
                    @{entry.username} {isCurrentUser && '(YOU)'}
                  </p>
                  <p className="text-[9px] text-[rgb(var(--theme-primary))] font-bold uppercase tracking-widest opacity-80 mt-2">
                    {entry.found} Nodes Secured
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {entry.streak > 0 && (
                  <div className="flex flex-col items-center opacity-80 group-hover:scale-110 transition-transform duration-500">
                     <Flame size={12} className="text-orange-500 fill-orange-500/20" />
                     <span className="text-[9px] font-black text-orange-500 tracking-tighter">{entry.streak}D</span>
                  </div>
                )}
                <div className="text-right min-w-[60px]">
                  <p className={`text-sm font-black tracking-tighter transition-colors duration-500 ${isDark ? 'text-zinc-100' : 'text-zinc-700'} ${isCurrentUser ? 'text-[rgb(var(--theme-primary))]' : ''}`}>
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-[8px] font-bold opacity-30 uppercase tracking-tighter">Total XP</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        sortedNodes.map((node, index) => {
          const netScore = (node.upvotes || 0) - (node.downvotes || 0);
          return (
            <div 
              key={node.id} 
              className={`node-card-animate group smart-glass p-5 rounded-[2.2rem] flex items-center justify-between border transition-all duration-500 ${
                isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-white border-zinc-100 shadow-sm'
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[rgb(var(--theme-primary))]/5 flex items-center justify-center font-black text-xs text-[rgb(var(--theme-primary))]/40 transition-colors duration-500 group-hover:text-[rgb(var(--theme-primary))]">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-bold text-sm leading-none tracking-tight truncate max-w-[150px]">
                    {node.name}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                      <ChevronUp size={10} /> {node.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400">
                      <ChevronDown size={10} /> {node.downvotes || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black tracking-tighter ${netScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netScore > 0 ? `+${netScore}` : netScore}
                </p>
                <p className="text-[8px] font-bold opacity-30 uppercase tracking-tighter">Net Rating</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
