import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Target, Lock, CheckCircle2, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function ZoomHandler({ setZoom }) {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
  });
  return null;
}

function MapRecenter({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView([location.lat, location.lng], 16);
  }, [location, map]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapInterface({ stableUserLoc, claimRadius, customRadius, radiusBonus }) {
  const map = useMap();
  const finalScan = (customRadius || 250) + (radiusBonus || 0);
  const finalClaim = (claimRadius || 20) + (radiusBonus || 0);

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
              <span className="opacity-60 flex items-center gap-1">
                {radiusBonus > 0 && <Zap size={10} />} CLAIM: {finalClaim}M
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--theme-primary))] animate-pulse" />
                SCAN: {finalScan}M
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
  customRadius,
  radiusBonus = 0, // NEW PROP from useGeoLocation
  onVote 
}) {
  const [mapRef, setMapRef] = useState(null);
  const [zoom, setZoom] = useState(16);

  const stableUserLoc = useMemo(() => {
    if (!userLocation?.lat) return null;
    return { lat: userLocation.lat, lng: userLocation.lng };
  }, [userLocation?.lat, userLocation?.lng]);

  const fallbackCenter = [50.0121, 22.6742];

  const animatedUserIcon = useMemo(() => {
    const size = 60; // Fixed size for the center point icon
    return L.divIcon({
      className: 'soft-radar-icon',
      html: `
        <div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-8 h-8 bg-[rgb(var(--theme-primary))] rounded-full opacity-20 animate-ping"></div>
          <div class="w-4 h-4 bg-white border-2 border-[rgb(var(--theme-primary))] rounded-full shadow-lg z-10"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }, []);

  const spotIcon = (isUnlocked) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="marker-pin-spot ${isUnlocked ? 'unlocked' : ''}"><div class="dot"></div></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  return (
    <div className={`relative w-full h-[70vh] rounded-[3rem] overflow-hidden border transition-all duration-700 ${
      isDark ? 'border-white/5 bg-zinc-950' : 'border-[rgb(var(--theme-primary))]/10 bg-emerald-50'
    }`}>
      <MapContainer 
        center={stableUserLoc ? [stableUserLoc.lat, stableUserLoc.lng] : fallbackCenter} 
        zoom={16} 
        zoomControl={false} 
        ref={setMapRef}
      >
        <ZoomHandler setZoom={setZoom} />
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
          radiusBonus={radiusBonus} 
        />

        {stableUserLoc && (
          <>
            {/* Visual Scan Range Circle */}
            <Circle 
              center={[stableUserLoc.lat, stableUserLoc.lng]}
              radius={(customRadius || 250) + radiusBonus}
              pathOptions={{
                fillColor: 'rgb(var(--theme-primary))',
                fillOpacity: 0.05,
                color: 'rgb(var(--theme-primary))',
                weight: 1,
                dashArray: '5, 10'
              }}
            />
            <Marker position={[stableUserLoc.lat, stableUserLoc.lng]} icon={animatedUserIcon} zIndexOffset={1000} />
          </>
        )}

        {Object.values(spots).map((spot) => {
          const isUnlocked = unlockedSpots.includes(spot.id);
          return (
            <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={spotIcon(isUnlocked)}>
              <Popup closeButton={false} offset={[0, -5]}>
                <div className="smart-glass p-3 rounded-2xl border border-white/10 min-w-[180px] shadow-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isUnlocked ? 'text-[rgb(var(--theme-primary))]' : 'text-zinc-500'}`}>
                      {isUnlocked ? 'CLAIMED' : 'LOCKED'}
                    </p>
                    {isUnlocked ? <CheckCircle2 size={12} className="text-[rgb(var(--theme-primary))]" /> : <Lock size={12} className="text-zinc-500" />}
                  </div>
                  <p className="text-xs font-bold text-white truncate mb-3">{spot.name}</p>
                  <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                    <button onClick={(e) => { e.stopPropagation(); onVote?.(spot.id, 'upvotes'); }} className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                      <ChevronUp size={18} /><span className="text-[10px] font-bold ml-1">{spot.upvotes || 0}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onVote?.(spot.id, 'downvotes'); }} className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-colors">
                      <ChevronDown size={18} /><span className="text-[10px] font-bold ml-1">{spot.downvotes || 0}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
