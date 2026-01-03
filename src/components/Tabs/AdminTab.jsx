import React, { useEffect, useState } from 'react';
import { 
  Terminal, 
  Trash2, 
  Zap, 
  TimerReset, 
  Radio, 
  ShieldAlert, 
  Plus, 
  Target, 
  Flame, 
  MapPin,
  Search,
  AlertTriangle,
  X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

function MapClickCapture({ onSelect }) {
  useMapEvents({
    click: (event) => {
      const { lat, lng } = event.latlng;
      onSelect({ lat, lng });
    }
  });
  return null;
}

function RightClickPan() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let isPanning = false;
    let lastPoint = null;

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    const handleMouseDown = (event) => {
      if (event.button !== 2) return;
      event.preventDefault();
      isPanning = true;
      lastPoint = map.mouseEventToContainerPoint(event);
    };

    const handleMouseMove = (event) => {
      if (!isPanning || !lastPoint) return;
      const currentPoint = map.mouseEventToContainerPoint(event);
      const delta = lastPoint.subtract(currentPoint);
      if (delta.x !== 0 || delta.y !== 0) {
        map.panBy(delta, { animate: false });
        lastPoint = currentPoint;
      }
    };

    const handleMouseUp = () => {
      isPanning = false;
      lastPoint = null;
    };

    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [map]);

  return null;
}

const getPreviewIcon = () => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: rgb(var(--theme-primary)); width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px var(--theme-primary-glow);"></div>`,
  iconSize: [15, 15],
  iconAnchor: [7, 7]
});

export default function AdminTab({ 
  spots, 
  unlockedSpots, 
  claimSpot, 
  removeSpot, 
  isDark, 
  resetTimer,
  addNewSpot,
  deleteSpotFromDB,
  userLocation,
  spotStreaks = {},
  updateNodeStreak,
  currentRadius,
  updateRadius,
  detectionOptions,
  currentClaimRadius,
  updateClaimRadius,
  claimOptions
}) {
  const [newSpot, setNewSpot] = useState({ name: '', lat: '', lng: '', points: 50 });
  const [searchQuery, setSearchQuery] = useState('');
  const [purgeTarget, setPurgeTarget] = useState(null);

  const generateRandomId = () => `spot-${Math.random().toString(16).slice(2, 10)}`;

  const handleUseMyLocation = () => {
    if (userLocation) {
      setNewSpot(prev => ({ 
        ...prev, 
        lat: userLocation.lat.toFixed(6), 
        lng: userLocation.lng.toFixed(6) 
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newSpot.name || !newSpot.lat || !newSpot.lng) return;
    
    addNewSpot({
      id: generateRandomId(),
      name: newSpot.name,
      lat: parseFloat(newSpot.lat),
      lng: parseFloat(newSpot.lng),
      points: parseInt(newSpot.points) || 0
    });
    setNewSpot({ name: '', lat: '', lng: '', points: 50 });
  };

  const confirmPurge = () => {
    if (purgeTarget) {
      deleteSpotFromDB(purgeTarget.id);
      setPurgeTarget(null);
    }
  };

  const filteredSpots = Object.values(spots).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const previewCenter = newSpot.lat && newSpot.lng 
    ? [parseFloat(newSpot.lat), parseFloat(newSpot.lng)] 
    : [40.730610, -73.935242];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-32">
      
      {/* --- CUSTOM PURGE MODAL --- */}
      {purgeTarget && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center px-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
          <div className="smart-glass w-full max-w-xs p-8 rounded-[3rem] border border-red-500/30 shadow-2xl text-center space-y-6 animate-in zoom-in-90 duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Confirm Purge</h3>
              <p className="text-[10px] opacity-60 font-medium leading-relaxed">
                Permanently delete <span className="text-red-400 font-bold">"{purgeTarget.name}"</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setPurgeTarget(null)} className="py-4 rounded-2xl bg-current/10 font-black text-[9px] uppercase tracking-widest transition-colors">Cancel</button>
              <button onClick={confirmPurge} className="py-4 rounded-2xl bg-red-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-500 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. DEVELOPER OVERRIDES */}
      <div className="smart-glass p-8 rounded-[2.5rem] border border-red-500/20 space-y-8">
        <div className="flex items-center gap-2 text-red-500 ml-1">
          <ShieldAlert size={16} />
          <h2 className="font-black uppercase text-[10px] tracking-[0.2em]">Developer Override</h2>
        </div>
        
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex justify-between px-1">
            <span className="flex items-center gap-2"><Radio size={12}/> Detection Radius</span>
            <span className="text-red-500 font-black">{currentRadius}m</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {detectionOptions?.map(opt => (
              <button
                key={opt.val}
                onClick={() => updateRadius(opt.val)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                  currentRadius === opt.val 
                  ? 'bg-red-500 border-red-500 text-white shadow-lg' 
                  : 'smart-glass border-current/5 opacity-40 hover:opacity-100 hover:border-red-500/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex justify-between px-1">
            <span className="flex items-center gap-2"><Target size={12}/> Claim Radius</span>
            <span className="text-red-500 font-black">{currentClaimRadius}m</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {claimOptions?.map(opt => (
              <button
                key={opt.val}
                onClick={() => updateClaimRadius(opt.val)}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                  currentClaimRadius === opt.val 
                  ? 'bg-red-500 border-red-500 text-white shadow-lg' 
                  : 'smart-glass border-current/5 opacity-40 hover:opacity-100 hover:border-red-500/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={resetTimer} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all border smart-glass border-current/5 opacity-60 hover:opacity-100 hover:text-red-500 active:scale-95">
          <TimerReset size={16}/> Reset Cooldown Timer
        </button>
      </div>

      {/* 2. DEPLOYMENT FORM */}
      <div className="smart-glass p-8 rounded-[3rem] border border-[rgb(var(--theme-primary))]/20 space-y-6">
        <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-[rgb(var(--theme-primary))] ml-1">
          <Plus size={14}/> Deploy New Node
        </h2>
        <div className="h-48 w-full rounded-[2rem] overflow-hidden border border-current/10 relative z-0">
          <MapContainer center={previewCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"} />
            <RightClickPan />
            <MapClickCapture onSelect={({ lat, lng }) => setNewSpot(prev => ({
              ...prev,
              lat: lat.toFixed(6),
              lng: lng.toFixed(6)
            }))} />
            {newSpot.lat && newSpot.lng && (
              <>
                <Marker position={previewCenter} icon={getPreviewIcon()} />
                <ChangeView center={previewCenter} />
              </>
            )}
          </MapContainer>
          <button type="button" onClick={handleUseMyLocation} className="absolute bottom-4 right-4 z-[1000] bg-[rgb(var(--theme-primary))] text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all"><Target size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Location Name" value={newSpot.name} onChange={e => setNewSpot({...newSpot, name: e.target.value})} className="w-full smart-glass p-4 rounded-2xl text-xs font-bold outline-none border border-current/5 focus:border-[rgb(var(--theme-primary))]/50" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" placeholder="Lat" value={newSpot.lat} onChange={e => setNewSpot({...newSpot, lat: e.target.value})} className="w-full smart-glass p-4 rounded-2xl text-xs font-bold outline-none border border-current/5 focus:border-[rgb(var(--theme-primary))]/50" />
            <input type="number" step="any" placeholder="Lng" value={newSpot.lng} onChange={e => setNewSpot({...newSpot, lng: e.target.value})} className="w-full smart-glass p-4 rounded-2xl text-xs font-bold outline-none border border-current/5 focus:border-[rgb(var(--theme-primary))]/50" />
          </div>
          <button type="submit" className="w-full bg-[rgb(var(--theme-primary))] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--theme-primary-glow)]">Deploy to Database</button>
        </form>
      </div>

      {/* 3. NODE REGISTRY */}
      <div className="smart-glass p-8 rounded-[3rem] border border-current/5 space-y-6">
        <div className="flex items-center justify-between ml-1">
          <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-[rgb(var(--theme-primary))]">
            <Terminal size={14}/> Registry ({Object.keys(spots).length})
          </h2>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input type="text" placeholder="Filter..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="smart-glass border border-current/10 rounded-full py-1.5 pl-8 pr-4 text-[10px] font-bold outline-none focus:border-[rgb(var(--theme-primary))]/50 w-32" />
          </div>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {filteredSpots.map(spot => {
            const currentStreak = spotStreaks?.[spot.id]?.streak ?? 0;
            const isUnlocked = unlockedSpots.includes(spot.id);
            return (
              <div key={spot.id} className="smart-glass p-5 rounded-[2rem] border border-current/5 hover:border-[rgb(var(--theme-primary))]/20 transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs font-bold tracking-tight truncate">{spot.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 opacity-40">
                        <MapPin size={8} />
                        <p className="text-[7px] font-mono uppercase truncate">{spot.id}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-[rgb(var(--theme-primary))] px-2 py-1 bg-[rgb(var(--theme-primary))]/10 rounded-lg">{spot.points} PTS</span>
                </div>
                <div className="flex items-center gap-4 bg-current/[0.03] p-3 rounded-2xl border border-current/5">
                  <div className="flex items-center gap-2 flex-1">
                    <Flame size={12} className={currentStreak > 0 ? "text-orange-500" : "opacity-20"} />
                    <span className="text-[9px] font-black uppercase opacity-40 tracking-tighter">Streak</span>
                    <input type="number" min="0" value={currentStreak} onChange={(e) => updateNodeStreak(spot.id, e.target.value)} className="w-12 bg-transparent text-xs font-black outline-none border-b border-current/10" />
                  </div>
                  <div className="flex gap-1 border-l border-current/10 pl-3">
                    <button onClick={() => isUnlocked ? removeSpot(spot.id) : claimSpot(spot.id)} className={`p-2 rounded-xl transition-all ${isUnlocked ? 'text-red-500 bg-red-500/10' : 'text-[rgb(var(--theme-primary))] bg-[rgb(var(--theme-primary))]/10'}`}>{isUnlocked ? <Trash2 size={14}/> : <Zap size={14}/>}</button>
                    <button onClick={() => setPurgeTarget(spot)} className="p-2 opacity-20 hover:opacity-100 hover:text-red-600 transition-colors"><ShieldAlert size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
