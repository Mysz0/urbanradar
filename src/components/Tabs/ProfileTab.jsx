import React from 'react';
import { Calendar, Leaf, Snowflake } from 'lucide-react';

export default function ProfileTab({ 
  tempUsername = "", 
  setTempUsername = () => {}, 
  saveUsername = () => {}, 
  showEmail = false, 
  toggleEmailVisibility = () => {}, 
  colors = {}, 
  isDark = false,
  lastChange = null,
  user = null,
  // Added default values here to prevent crashes if props are missing
  appStyle = 'emerald',
  setAppStyle = () => {}
}) {
  const provider = user?.app_metadata?.provider || 'account';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const getCooldownInfo = () => {
    if (!lastChange) return null;
    const last = new Date(lastChange).getTime();
    const daysPassed = (new Date().getTime() - last) / (1000 * 60 * 60 * 24);
    if (daysPassed >= 7) return null;
    return Math.ceil(7 - daysPassed);
  };

  const daysLeft = getCooldownInfo();

  return (
    <div className="smart-glass p-10 rounded-[3rem] border space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* IDENTITY SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-end ml-1">
          <label className="text-[10px] font-bold text-[rgb(var(--theme-primary))] uppercase tracking-widest">Identity</label>
          {daysLeft && (
            <span className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
              <Calendar size={10} /> Lock: {daysLeft}d
            </span>
          )}
        </div>
        
        <input 
          type="text" 
          value={tempUsername} 
          onChange={(e) => setTempUsername(e.target.value)}
          className="w-full smart-glass border rounded-2xl py-5 px-6 font-bold outline-none focus:border-[rgb(var(--theme-primary))] transition-all text-sm"
          placeholder="Your callsign..."
        />
        
        <button 
          onClick={saveUsername}
          disabled={!!daysLeft}
          className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
            daysLeft 
            ? 'bg-zinc-500/10 text-zinc-500 cursor-not-allowed' 
            : 'bg-[rgb(var(--theme-primary))] text-white shadow-lg shadow-emerald-500/20 active:scale-95'
          }`}
        >
          {daysLeft ? 'Identity Locked' : 'Update Identity'}
        </button>
      </div>

      <div className="h-[1px] w-full bg-white/5" />

      {/* VISUAL INTERFACE (THEME SWITCHER) */}
      <div className="space-y-4 px-1">
        <div className="space-y-0.5">
          <p className={`text-xs font-bold uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-800'}`}>Visual Interface</p>
          <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-emerald-800/50'}`}>Select your HUD aesthetic</p>
        </div>

        <div className="flex gap-2 p-1.5 smart-glass border rounded-2xl">
          <button 
            onClick={() => setAppStyle('emerald')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'emerald' 
              ? 'bg-emerald-500 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-emerald-500'
            }`}
          >
            <Leaf size={14} />
            <span className="text-[10px] font-bold uppercase">Emerald</span>
          </button>

          <button 
            onClick={() => setAppStyle('winter')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'winter' 
              ? 'bg-blue-400 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-blue-400'
            }`}
          >
            <Snowflake size={14} />
            <span className="text-[10px] font-bold uppercase">Winter</span>
          </button>
        </div>
      </div>

      {/* EMAIL TOGGLE */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <p className={`text-xs font-bold uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-800'}`}>Display Email</p>
          <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-emerald-800/50'}`}>Show contact in header</p>
        </div>
        
        <button 
          onClick={toggleEmailVisibility}
          className={`w-12 h-6 rounded-full transition-all relative ${showEmail ? 'bg-[rgb(var(--theme-primary))]' : (isDark ? 'bg-zinc-700' : 'bg-zinc-300')}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${showEmail ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
}
