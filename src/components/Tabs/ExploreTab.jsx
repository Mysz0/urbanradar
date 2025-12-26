import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Target, Lock, ShieldCheck } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function MapController({ coords }) {
  const map = useMap();
  const lastPos = useRef(null);

  useEffect(() => {
    if (!coords?.lat || !coords?.lng) return;
    const moveDist = lastPos.current ? getDistance(coords.lat, coords.lng, lastPos.current.lat, lastPos.current.lng) : 999;
    if (moveDist > 3) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 1 });
      lastPos.current = coords;
    }
  }, [coords, map]);
  return null;
}

export default function ExploreTab({ spots = {}, unlockedSpots = [], userLocation, isDark, claimRadius = 20 }) {
  const [map, setMap] = useState(null);
  
  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat) return null;
    return {
      lat: Math.round(userLocation.lat * 1000000) / 1000000,
      lng: Math.round(userLocation.lng * 1000000) / 1000000
    };
  }, [userLocation?.lat, userLocation?.lng]);

  const initialCenter = useMemo(() => stableUserLoc ? [stableUserLoc.lat, stableUserLoc.lng] : [40.7306, -73.9352], []);

  // NEW: User "Radius Box" Icon
  const userIcon = useMemo(() => L.divIcon({
    className: 'leaflet-user-box-icon',
    html: `
      <div class="user-box-container">
        <div class="user-box-scanner"></div>
        <div class="user-box-core"></div>
      </div>`,
    iconSize: [30, 30], 
    iconAnchor: [15, 15] // Centered
  }), []);

  // FIXED: Aligned Spot Icon
  const spotIcon = (isUnlocked) => L.divIcon({
    className: 'leaflet-spot-icon',
    html: `
      <div class="marker-wrapper">
        <div class="pulse-ring ${isUnlocked ? 'pulse-green' : ''}"></div>
        <div class="marker-core ${isUnlocked ? 'core-green' : ''}"></div>
      </div>`,
    iconSize: [20, 20], 
    iconAnchor: [10, 10] // Centered
  }), []);

  return (
    <div 
      style={{ height: '70vh', width: '100%', position: 'relative' }} 
      className={`rounded-[2.5rem] overflow-hidden border transition-colors duration-700 ${
        isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
      }`}
    >
      {/* Styles for the new markers */}
      <style>{`
        .user-box-container {
          position: relative;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-box-scanner {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px dashed rgb(var(--theme-primary));
          border-radius: 6px;
          animation: rotateBox 4s linear infinite;
          opacity: 0.5;
        }
        .user-box-core {
          width: 8px;
          height: 8px;
          background: rgb(var(--theme-primary));
          border-radius: 1px;
          box-shadow: 0 0 10px rgb(var(--theme-primary));
        }
        @keyframes rotateBox {
          from { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          to { transform: rotate(360deg) scale(1); }
        }
        .marker-wrapper {
          position: relative;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(var(--theme-primary), 0.4);
          animation: spotPulse 2s ease-out infinite;
        }
        .pulse-green { background: rgba(34, 197, 94, 0.4); }
        .marker-core {
          width: 10px;
          height: 10px;
          background: rgb(var(--theme-primary));
          border: 2px solid white;
          border-radius: 50%;
          z-index: 2;
        }
        .core-green { background: #22c55e !important; }
        @keyframes spotPulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      <button 
        onClick={() => stableUserLoc && map?.flyTo([stableUserLoc.lat, stableUserLoc.lng], 16)}
        className="absolute top-6 right-6 z-[1000] smart-glass p-3 rounded-2xl border border-white/10 active:scale-90 transition-all pointer-events-auto"
      >
        <Target size={18} className="text-[rgb(var(--theme-primary))]" />
      </button>

      <MapContainer 
        center={initialCenter} 
        zoom={15} 
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        zoomControl={false}
        scrollWheelZoom={true}
        ref={setMap}
        preferCanvas={true}
      >
        <TileLayer
          key={isDark ? 'dark-tiles' : 'light-tiles'}
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />

        <MapController coords={stableUserLoc} />

        {stableUserLoc && (
          <>
            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={userIcon} zIndexOffset={1000} />
            <Circle 
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={claimRadius} 
              pathOptions={{ 
                color: 'rgb(var(--theme-primary))', 
                fillColor: 'rgb(var(--theme-primary))', 
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '4 4',
                interactive: false 
              }}
            />
          </>
        )}

        {Object.values(spots).map((spot) => {
          const isUnlocked = unlockedSpots.includes(spot.id);
          return (
            <Marker 
              key={spot.id} 
              position={[spot.lat, spot.lng]} 
              icon={spotIcon(isUnlocked)} 
              opacity={isUnlocked ? 1 : 0.6}
            >
               <Popup closeButton={false} offset={[0, -10]}>
                <div className="smart-glass p-3 rounded-xl border border-white/5 min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    {isUnlocked ? (
                      <ShieldCheck size={12} className="text-green-500" />
                    ) : (
                      <Lock size={12} className="text-zinc-500" />
                    )}
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isUnlocked ? 'text-green-500' : 'text-zinc-500'}`}>
                      {isUnlocked ? 'Secured Node' : 'Locked Node'}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-white truncate">{spot.name}</p>
                  {isUnlocked && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">Status</span>
                      <span className="text-[8px] font-black text-green-500 uppercase">Active</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="smart-glass border p-4 rounded-2xl flex justify-between items-center shadow-2xl">
          <div className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {stableUserLoc ? (
              <span className="flex gap-3">
                <span>{stableUserLoc.lat.toFixed(5)} N</span>
                <span>{stableUserLoc.lng.toFixed(5)} E</span>
              </span>
            ) : 'CALIBRATING GPS...'}
          </div>
          <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
            {claimRadius}M SCAN
          </div>
        </div>
      </div>
    </div>
  );
}
