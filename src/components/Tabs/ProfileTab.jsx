import React from 'react';
import { Calendar } from 'lucide-react';

export default function ProfileTab({ 
  tempUsername, 
  setTempUsername, 
  saveUsername, 
  showEmail, 
  toggleEmailVisibility, 
  colors, 
  isDark,
  lastChange // Added this
}) {
  // Logic to show remaining days
  const getCooldownInfo = () => {
    if (!lastChange) return null;
    const last = new Date(lastChange).getTime();
    const daysPassed = (new Date().getTime() - last) / (1000 * 60 * 60 * 24);
    if (daysPassed >= 7) return null;
    return Math.ceil(7 - daysPassed);
  };

  const daysLeft = getCooldownInfo();

  return (
    <div className={`${colors.glass} p-10 rounded-[3rem] border space-y-8 animate-in fade-in zoom-in-95 duration-300`}>
      <div className="space-y-3">
        <div className="flex justify-between items-end ml-1">
          <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Identity</label>
          {daysLeft && (
            <span className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Calendar size={10} /> Lock: {daysLeft}d
            </span>
          )}
        </div>
        <input 
          type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
          className={`w-full ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white/40 border-emerald-200/50 text-zinc-900'} border rounded-2xl py-5 px-6 font-bold outline-none focus:border-emerald-500 transition-all text-sm`}
          placeholder="Your callsign..."
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <p className="text-xs font-bold uppercase tracking-tight">Display Email</p>
          <p className="text-[10px] text-zinc-500">Show your GitHub contact in header</p>
        </div>
        <button 
          onClick={toggleEmailVisibility}
          className={`w-12 h-6 rounded-full transition-all duration-300 relative ${showEmail ? 'bg-emerald-500' : 'bg-zinc-700/50'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${showEmail ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <button 
        onClick={saveUsername} 
        disabled={daysLeft !== null}
        className={`w-full py-5 rounded-2xl font-bold shadow-lg transition-all text-sm ${
          daysLeft 
          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' 
          : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
        }`}
      >
        {daysLeft ? 'Changes Locked' : 'Apply Changes'}
      </button>
    </div>
  );
}
