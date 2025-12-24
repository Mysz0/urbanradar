import React from 'react';
import { Terminal, Trash2, Zap, TimerReset, Radio, ShieldAlert } from 'lucide-react';

export default function AdminTab({ 
  spots, 
  unlockedSpots, 
  claimSpot, 
  removeSpot, 
  isDark, 
  colors,
  resetTimer,     // New
  currentRadius,  // New
  updateRadius    // New
}) {
  const radiusOptions = [
    { label: '250m', val: 0.25 },
    { label: '500m', val: 0.5 },
    { label: '1km', val: 1.0 },
    { label: '5km', val: 5.0 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* GOD MODE SETTINGS */}
      <div className={`${colors.glass} p-8 rounded-[2.5rem] border border-red-500/20 space-y-6`}>
        <div className="flex items-center gap-2 text-red-500 ml-1">
          <ShieldAlert size={16} />
          <h2 className="font-black uppercase text-[10px] tracking-[0.2em]">Developer Override</h2>
        </div>

        {/* Radius Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Radio size={12}/> Detection Radius
          </label>
          <div className="grid grid-cols-4 gap-2">
            {radiusOptions.map(opt => (
              <button
                key={opt.val}
                onClick={() => updateRadius(opt.val)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                  currentRadius === opt.val 
                  ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Reset Button */}
        <button 
          onClick={resetTimer}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all border ${
            isDark ? 'bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-400 hover:text-red-500' 
                   : 'bg-white border-zinc-200 hover:bg-red-50 text-zinc-500 hover:text-red-500'
          }`}
        >
          <TimerReset size={16}/> Reset Cooldown Timer
        </button>
      </div>

      {/* NODE OVERRIDE LIST */}
      <div className={`${colors.glass} p-8 rounded-[3rem] border space-y-6`}>
        <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-emerald-500 ml-1">
          <Terminal size={14}/> Node Override
        </h2>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {Object.values(spots).map(spot => {
            const isClaimed = unlockedSpots.includes(spot.id);
            return (
              <div key={spot.id} className={`${isDark ? 'bg-white/5' : 'bg-white/30'} p-4 rounded-[1.8rem] flex justify-between items-center border border-white/5 hover:border-emerald-500/20 transition-all`}>
                <span className="text-xs font-bold tracking-tight">{spot.name}</span>
                <div className="flex gap-2">
                  {isClaimed ? (
                    <button onClick={() => removeSpot(spot.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                      <Trash2 size={16}/>
                    </button>
                  ) : (
                    <button onClick={() => claimSpot(spot.id)} className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all">
                      <Zap size={16}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
