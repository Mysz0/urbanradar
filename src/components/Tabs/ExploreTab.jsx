import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. STABILIZED DISTANCE CALC
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

    // SHAKE-PROOF: Only pan if user moved > 3 meters
    // This matches your 3m update preference
    if (moveDist > 3) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 1 });
      lastPos.current = coords;
    }
  }, [coords, map]);
  return null;
}

export default function ExploreTab({ spots = {}, unlockedSpots = [], userLocation, isDark }) {
  const [map, setMap] = useState(null);
  
  // FIXED RANGE: Hardcoded to match useGeoLocation security
  const CLAIM_RANGE = 20;

  // 2. COORDINATE ROUNDING
  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat) return null;
    return {
      lat: Math.round(userLocation.lat * 1000000) / 1000000,
      lng: Math.round(userLocation.lng * 1000000) / 1000000
    };
  }, [userLocation?.lat, userLocation?.lng]);

  const initialCenter = useMemo(() => stableUserLoc ? [stableUserLoc.lat, stableUserLoc.lng] : [40.7306, -73.9352], []);

  const userIcon = useMemo(() => L.divIcon({
    className: 'leaflet-user-icon',
    html: `<div class="user-marker-container"><div class="user-pulse-ring"></div><div class="user-marker-core"></div></div>`,
    iconSize: [0, 0], iconAnchor: [0, 0]
  }), []);

  const spotIcon = useMemo(() => L.divIcon({
    className: 'leaflet-spot-icon',
    html: `<div class="marker-container"><div class="pulse-ring"></div><div class="marker-core"></div></div>`,
    iconSize: [0, 0], iconAnchor: [0, 0]
  }), []);

  return (
    <div 
      style={{ height: '70vh', width: '100%', position: 'relative' }} 
      className={`rounded-[2.5rem] overflow-hidden border transition-colors duration-700 ${
        isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
      }`}
    >
      <button 
        onClick={() => map?.flyTo([stableUserLoc.lat, stableUserLoc.lng], 15)}
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
        markerZoomAnimation={true}
      >
        <TileLayer
          key={isDark ? 'dark-tiles' : 'light-tiles'}
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          attribution=""
        />

        <MapController coords={stableUserLoc} />

        {stableUserLoc && (
          <>
            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={userIcon} />
            <Circle 
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={CLAIM_RANGE} 
              pathOptions={{ 
                color: 'rgb(var(--theme-primary))', 
                fillColor: 'rgb(var(--theme-primary))', 
                fillOpacity: 0.1,
                weight: 1,
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
            opacity={unlockedSpots.includes(spot.id) ? 1 : 0.4}
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

      {/* FOOTER STATUS PANEL */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="smart-glass border p-4 rounded-2xl flex justify-between items-center shadow-2xl">
          <div className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {stableUserLoc ? (
              <span className="flex gap-3">
                <span>{stableUserLoc.lat.toFixed(5)} N</span>
                <span>{stableUserLoc.lng.toFixed(5)} E</span>
              </span>
            ) : 'AQUIRING SIGNAL...'}
          </div>
          <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
            {CLAIM_RANGE}M RANGE
          </div>
        </div>
      </div>
    </div>
  );
}
