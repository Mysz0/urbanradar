import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Helper to calculate distance (in meters) between two points
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function MapController({ coords }) {
  const map = useMap();
  const [lastFlyTo, setLastFlyTo] = useState(null);

  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      const dist = lastFlyTo ? getDistance(coords.lat, coords.lng, lastFlyTo.lat, lastFlyTo.lng) : 999;
      
      // STABILIZATION: Only pan the camera if moved > 5 meters
      if (dist > 5) {
        map.flyTo([coords.lat, coords.lng], 15, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
        setLastFlyTo(coords);
      }
    }
  }, [coords, map, lastFlyTo]);
  return null;
}

export default function ExploreTab({ spots = {}, unlockedSpots = [], userLocation, radius, isDark }) {
  const [map, setMap] = useState(null);

  // STABILIZATION: Round user location to 6 decimal places to prevent micro-jitter
  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat) return null;
    return {
      lat: parseFloat(userLocation.lat.toFixed(6)),
      lng: parseFloat(userLocation.lng.toFixed(6))
    };
  }, [userLocation?.lat, userLocation?.lng]);

  const initialCenter = stableUserLoc 
    ? [stableUserLoc.lat, stableUserLoc.lng] 
    : [40.7306, -73.9352];

  const userIcon = L.divIcon({
    className: 'leaflet-user-icon',
    html: `<div class="user-marker-container"><div class="user-pulse-ring"></div><div class="user-marker-core"></div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  const spotIcon = L.divIcon({
    className: 'leaflet-spot-icon',
    html: `<div class="marker-container"><div class="pulse-ring"></div><div class="marker-core"></div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  return (
    <div 
      style={{ height: '70vh', width: '100%', position: 'relative' }} 
      className={`rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all duration-700 ${
        isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
      }`}
    >
      <button 
        onClick={() => {
          if (map && stableUserLoc) {
            map.flyTo([stableUserLoc.lat, stableUserLoc.lng], 15, { animate: true });
          }
        }}
        className="absolute top-6 right-6 z-[1000] smart-glass p-3 rounded-2xl border border-[rgb(var(--theme-primary))]/20 hover:scale-110 active:scale-90 transition-all pointer-events-auto"
      >
        <Target size={18} className="text-[rgb(var(--theme-primary))]" />
      </button>

      <MapContainer 
        center={initialCenter} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
        ref={setMap}
        preferCanvas={true} // Performance boost
      >
        <TileLayer
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          attribution=""
        />

        <MapController coords={stableUserLoc} />

        {stableUserLoc?.lat && (
          <>
            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={userIcon}>
              <Popup closeButton={false} offset={[0, -10]}>
                <div className="custom-popup-box">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Signal Locked</span>
                  </div>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={radius || 10} 
              pathOptions={{ 
                color: 'rgb(var(--theme-primary))', 
                fillColor: 'rgb(var(--theme-primary))', 
                fillOpacity: isDark ? 0.1 : 0.15,
                weight: 1,
                interactive: false // Prevents circle from blocking marker clicks
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
            {/* ... popup content stays same ... */}
          </Marker>
        ))}
      </MapContainer>

      {/* FOOTER STATUS PANEL */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="smart-glass border p-4 rounded-2xl flex justify-between items-center shadow-2xl">
          <div className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-white' : 'text-zinc-800'}`}>
            {stableUserLoc ? (
              <span className="flex gap-3">
                <span>LAT: {stableUserLoc.lat.toFixed(4)}</span>
                <span>LNG: {stableUserLoc.lng.toFixed(4)}</span>
              </span>
            ) : 'AQUIRING SIGNAL...'}
          </div>
          <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] italic uppercase tracking-tighter flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
            {radius}M RANGE
          </div>
        </div>
      </div>
    </div>
  );
}
