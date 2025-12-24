import React, { useState } from 'react';
import { Terminal, Trash2, Zap, TimerReset, Radio, ShieldAlert, Plus, MapPin } from 'lucide-react';

export default function AdminTab({ 
  spots, 
  unlockedSpots, 
  claimSpot, 
  removeSpot, 
  isDark, 
  colors,
  resetTimer,
  currentRadius,
  updateRadius,
  addNewSpot,        // New
  deleteSpotFromDB   // New
}) {
  const [newSpot, setNewSpot] = useState({ name: '', lat: '', lng: '', points: 50 });

  const radiusOptions = [
    { label: '250m', val: 0.25 },
    { label: '500m', val: 0.5 },
    { label: '1km', val: 1.0 },
    { label: '5km', val: 5.0 },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newSpot.name || !newSpot.lat || !newSpot.lng) return;
    addNewSpot({
      name: newSpot.name,
      lat: parseFloat(newSpot.lat),
      lng: parseFloat(newSpot.lng),
      points: parseInt(newSpot.points)
    });
    setNewSpot({ name: '', lat: '', lng: '', points: 50 });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. GOD MODE SETTINGS */}
      <div className={`${colors.glass} p-8 rounded-[2.5rem] border border-red-500/20 space-y-6`}>
        <div className="flex items-center gap-2 text-red-500 ml-1">
          <ShieldAlert size={16} />
          <h2 className="font-black uppercase text-[10px] tracking-[0.2em]">Developer Override</h2>
        </div>
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
        <button onClick={resetTimer} className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all border ${isDark ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-red-500' : 'bg-white border-zinc-200 text-zinc-500 hover:text-red-500'}`}>
          <TimerReset size={16}/> Reset Cooldown Timer
        </button>
      </div>

      {/* 2. ADD NEW SPOT FORM */}
      <div className={`${colors.glass} p-8 rounded-[3rem] border border-emerald-500/20 space-y-6`}>
        <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-emerald-500 ml-1">
          <Plus size={14}/> Deploy New Node
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input 
            type="text" placeholder="Location Name" 
            value={newSpot.name} onChange={e => setNewSpot({...newSpot, name: e.target.value})}
            className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-zinc-200'}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="number" step="any" placeholder="Latitude" 
              value={newSpot.lat} onChange={e => setNewSpot({...newSpot, lat: e.target.value})}
              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-zinc-200'}`}
            />
            <input 
              type="number" step="any" placeholder="Longitude" 
              value={newSpot.lng} onChange={e => setNewSpot({...newSpot, lng: e.target.value})}
              className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-zinc-200'}`}
            />
          </div>
          <input 
            type="number" placeholder="Points" 
            value={newSpot.points} onChange={e => setNewSpot({...newSpot, points: e.target.value})}
            className={`w-full p-4 rounded-2xl text-xs font-bold outline-none border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-zinc-200'}`}
          />
          <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">
            Add Spot to Map
          </button>
        </form>
      </div>

      {/* 3. NODE OVERRIDE LIST */}
      <div className={`${colors.glass} p-8 rounded-[3rem] border space-y-6`}>
        <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-emerald-500 ml-1">
          <Terminal size={14}/> Active Nodes
        </h2>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {Object.values(spots).map(spot => (
            <div key={spot.id} className={`${isDark ? 'bg-white/5' : 'bg-white/30'} p-4 rounded-[1.8rem] border border-white/5 hover:border-emerald-500/20 transition-all`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold tracking-tight">{spot.name}</span>
                <span className="text-[9px] font-black text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded-lg">{spot.points} PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <button onClick={() => unlockedSpots.includes(spot.id) ? removeSpot(spot.id) : claimSpot(spot.id)} className={`p-2 rounded-xl transition-all ${unlockedSpots.includes(spot.id) ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                    {unlockedSpots.includes(spot.id) ? <Trash2 size={14}/> : <Zap size={14}/>}
                  </button>
                </div>
                {/* PERMANENT DELETE FROM DB */}
                <button 
                  onClick={() => { if(confirm('Delete permanently?')) deleteSpotFromDB(spot.id) }} 
                  className="text-[9px] uppercase font-bold text-zinc-500 hover:text-red-500 transition-colors"
                >
                  Remove from DB
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
