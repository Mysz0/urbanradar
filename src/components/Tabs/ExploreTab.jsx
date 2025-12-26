import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// FIX 1: This component forces the map to move when userLocation is first found
function MapRecenter({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 16);
    }
  }, [location, map]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapInterface({ stableUserLoc, claimRadius, customRadius }) {
  const map = useMap();
  return (
    <>
      <div className="leaflet-top leaflet-right" style={{ marginTop: '24px', marginRight: '24px' }}>
        <div className="leaflet-control pointer-events-auto">
          <button
            onClick={(e) => {
              e.preventDefault();
              if (stableUserLoc) map.flyTo([stableUserLoc.lat, stableUserLoc.lng], 16);
            }}
            className="smart-glass w-12 h-12 flex items-center justify-center rounded-2xl active:scale-90 transition-all shadow-2xl"
          >
            <Target size={22} className="text-[rgb(var(--theme-primary))]" />
          </button>
        </div>
      </div>

      <div className="leaflet-bottom leaflet-left leaflet-right" style={{ marginBottom: '24px', padding: '0 24px' }}>
        <div className="leaflet-control w-full pointer-events-none">
          <div className="smart-glass border p-4 rounded-3xl flex justify-between items-center shadow-2xl w-full pointer-events-auto">
            <div className="text-[10px] font-bold tracking-widest uppercase opacity-70">
              {stableUserLoc ? `${stableUserLoc.lat.toFixed(5)}°N ${stableUserLoc.lng.toFixed(5)}°E` : 'LOCATING...'}
            </div>
            <div className="text-[rgb(var(--theme-primary))] font-black text-[10px] uppercase tracking-tighter flex items-center gap-5">
              <span className="opacity-60">CLAIM: {claimRadius}M</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
                SCAN: {customRadius}M
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ExploreTab({ 
  spots = {}, 
  unlockedSpots = [], 
  userLocation, 
  isDark, 
  claimRadius, 
  customRadius 
}) {
  const [mapRef, setMapRef] = useState(null);

  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat) return null;
    return { lat: userLocation.lat, lng: userLocation.lng };
  }, [userLocation?.lat, userLocation?.lng]);

  const fallbackCenter = [40.7306, -73.9352];

  const userIcon = useMemo(() => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="marker-pin-user">
              <div class="pulse"></div>
              <div class="dot"></div>
            </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  }), []);

  const spotIcon = (isUnlocked) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="marker-pin-spot ${isUnlocked ? 'unlocked' : ''}">
              <div class="dot"></div>
            </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  return (
    <div className={`relative w-full h-[70vh] rounded-[3rem] overflow-hidden border transition-all duration-700 ${
      isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
    }`}>
      <MapContainer 
        center={stableUserLoc ? [stableUserLoc.lat, stableUserLoc.lng] : fallbackCenter} 
        zoom={15} 
        zoomControl={false} 
        scrollWheelZoom={true} 
        ref={setMapRef}
      >
        <MapInvalidator />
        <MapRecenter location={stableUserLoc} />
        
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
        />

        <MapInterface 
          stableUserLoc={stableUserLoc} 
          claimRadius={claimRadius} 
          customRadius={customRadius} 
        />

        {stableUserLoc && (
          <>
            <Circle
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={Number(claimRadius) || 20}
              pathOptions={{
                color: 'rgb(var(--theme-primary))',
                fillColor: 'rgb(var(--theme-primary))',
                fillOpacity: 0.1,
                weight: 1.5,
                interactive: false
              }}
            />
            
            <Circle
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={Number(customRadius) || 50}
              pathOptions={{
                color: 'rgb(var(--theme-primary))',
                fillColor: 'transparent',
                className: 'radar-ping', /* Hooks into the rotation and scale fix */
                interactive: false
              }}
            />

            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={userIcon} zIndexOffset={1000} />
          </>
        )}

        {Object.values(spots).map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]} 
            icon={spotIcon(unlockedSpots.includes(spot.id))}
          >
            <Popup closeButton={false} offset={[0, -5]}>
              <div className="smart-glass p-3 rounded-2xl border border-white/10 min-w-[140px] shadow-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Node</p>
                <p className="text-xs font-bold text-white truncate">{spot.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
