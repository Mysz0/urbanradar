import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Target } from 'lucide-react';
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

  // FIXED: Increased iconSize from [0,0] to [20,20] and added fallback styles
  const userIcon = useMemo(() => L.divIcon({
    className: 'leaflet-user-icon',
    html: `
      <div class="user-marker-container" style="width: 20px; height: 20px;">
        <div class="user-pulse-ring"></div>
        <div class="user-marker-core" style="background: rgb(var(--theme-primary)); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
      </div>`,
    iconSize: [20, 20], 
    iconAnchor: [10, 10]
  }), []);

  const spotIcon = useMemo(() => L.divIcon({
    className: 'leaflet-spot-icon',
    html: `<div class="marker-container"><div class="pulse-ring"></div><div class="marker-core"></div></div>`,
    iconSize: [20, 20], 
    iconAnchor: [10, 10]
  }), []);

  return (
    <div 
      style={{ height: '70vh', width: '100%', position: 'relative' }} 
      className={`rounded-[2.5rem] overflow-hidden border transition-colors duration-700 ${
        isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
      }`}
    >
      <button 
        onClick={() => stableUserLoc && map?.flyTo([stableUserLoc.lat, stableUserLoc.lng], 16)}
        className="absolute top-6 right-6 z-[1000] smart-glass p-3 rounded-2xl border border-[rgb(var(--theme-primary))]/20 active:scale-90 transition-all pointer-events-auto"
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
            {/* The Dot */}
            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={userIcon} zIndexOffset={1000} />
            
            {/* The Claim Circle */}
            <Circle 
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={claimRadius} 
              pathOptions={{ 
                color: 'rgb(var(--theme-primary))', 
                fillColor: 'rgb(var(--theme-primary))', 
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 10',
                interactive: false 
              }}
            />
          </>
        )}

        {Object.values(spots).map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]} 
            icon={spotIcon} 
            opacity={unlockedSpots.includes(spot.id) ? 1 : 0.6}
          >
             <Popup closeButton={false} offset={[0, -10]}>
              <div className="custom-popup-box">
                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Localized Node</p>
                <p className="text-xs font-bold uppercase tracking-tight">{spot.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="smart-glass border p-4 rounded-2xl flex justify-between items-center shadow-2xl">
          <div className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {stableUserLoc ? (
              <span className="flex gap-3">
                <span>{stableUserLoc.lat.toFixed(5)} N</span>
                <span>{stableUserLoc.lng.toFixed(5)} E</span>
              </span>
            ) : 'ACQUIRING SIGNAL...'}
          </div>
          <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
            {claimRadius}M RANGE
          </div>
        </div>
      </div>
    </div>
  );
}
