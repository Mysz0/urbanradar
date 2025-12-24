import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Component to handle auto-centering on load
function MapController({ coords }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (coords && !hasCentered) {
      map.flyTo([coords.latitude, coords.longitude], 16, {
        duration: 2,
        easeLinearity: 0.25
      });
      setHasCentered(true);
    }
  }, [coords, map, hasCentered]);

  return null;
}

export default function ExploreTab({ spots, unlockedSpots, userLocation, radius }) {
  
  // Custom Blue Pulse Marker for the User
  const userIcon = L.divIcon({
    className: 'leaflet-user-icon',
    html: `
      <div class="user-marker-container">
        <div class="user-pulse-ring"></div>
        <div class="user-marker-core"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <div className="h-full w-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative bg-zinc-950">
      <MapContainer 
        center={[0, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {/* Auto-Centering Logic */}
        <MapController coords={userLocation} />

        {/* USER LOCATION & RANGE CIRCLE */}
        {userLocation && (
          <>
            <Marker 
              position={[userLocation.latitude, userLocation.longitude]} 
              icon={userIcon}
            >
              <Popup>
                <span className="font-bold text-zinc-900">Current Position</span>
              </Popup>
            </Marker>
            
            <Circle 
              center={[userLocation.latitude, userLocation.longitude]}
              radius={radius}
              pathOptions={{ 
                color: '#10b981', 
                fillColor: '#10b981', 
                fillOpacity: 0.05, 
                weight: 2,
                dashArray: '8, 12'
              }}
            />
          </>
        )}

        {/* WORLD NODES */}
        {Object.values(spots).map((spot) => {
          const isUnlocked = unlockedSpots.includes(spot.id);
          return (
            <Marker 
              key={spot.id} 
              position={[spot.lat, spot.lng]} 
              icon={DefaultIcon}
              opacity={isUnlocked ? 1 : 0.4}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-black text-sm text-zinc-900 uppercase tracking-tighter">{spot.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                    {isUnlocked ? '✓ Node Secured' : '🔒 Signal Detected'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* GPS OVERLAY PANEL */}
      <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
        <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">GPS ACTIVE</p>
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">
                {userLocation ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 'Scanning for satellites...'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-emerald-500 uppercase italic leading-none">{radius}m</p>
            <p className="text-[8px] font-bold text-zinc-600 uppercase mt-1">Detection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
