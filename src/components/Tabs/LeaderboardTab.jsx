import React from 'react';
import { Flame } from 'lucide-react';

export default function LeaderboardTab({ leaderboard, username, colors }) {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-[rgb(var(--theme-primary))]/50 px-4">
        Global Rankings
      </h2>
      
      {leaderboard.map((entry, index) => {
        const isCurrentUser = entry.username === username;
        
        return (
          <div 
            key={index} 
            className={`collection-card ${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border backdrop-blur-md transition-all duration-500 ${
              isCurrentUser ? 'border-[rgb(var(--theme-primary))]/30' : 'border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Rank Badge */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-colors duration-500 ${
                index === 0 
                  ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg shadow-[var(--theme-primary-glow)]' 
                  : 'bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))]'
              }`}>
                {index + 1}
              </div>

              <div>
                <p className={`font-bold text-sm transition-colors ${
                  isCurrentUser ? 'text-[rgb(var(--theme-primary))]' : ''
                }`}>
                  @{entry.username} {isCurrentUser && '(YOU)'}
                </p>
                <p className="text-[9px] text-[rgb(var(--theme-primary))] font-bold uppercase tracking-widest opacity-80">
                  {entry.found} Nodes Secured
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* STREAK COLUMN */}
              {entry.streak > 0 && (
                <div className="flex flex-col items-center opacity-80">
                   <Flame size={12} className="text-orange-500 fill-orange-500/20" />
                   <span className="text-[9px] font-black text-orange-500 tracking-tighter">{entry.streak}D</span>
                </div>
              )}

              {/* SCORE COLUMN */}
              <div className="text-right min-w-[60px]">
                <p className={`text-sm font-black tracking-tighter ${
                  isCurrentUser ? 'text-[rgb(var(--theme-primary))]' : ''
                }`}>
                  {entry.score.toLocaleString()}
                </p>
                <p className="text-[8px] font-bold opacity-30 uppercase tracking-tighter">Total XP</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
