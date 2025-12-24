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

function MapController({ coords }) {
  const map = useMap();
  useEffect(() => {
    // Reverting to your previous logic: Fly to user whenever coords change
    if (coords?.lat && coords?.lng) {
      map.flyTo([coords.lat, coords.lng], 15);
    }
  }, [coords, map]);
  return null;
}

export default function ExploreTab({ spots = {}, unlockedSpots = [], userLocation, radius }) {
  
  const userIcon = L.divIcon({
    className: 'leaflet-user-icon',
    html: `<div class="user-marker-container"><div class="user-pulse-ring"></div><div class="user-marker-core"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    /* We force a height here so it CANNOT be 0px */
    <div style={{ height: '70vh', width: '100%', position: 'relative' }} className="rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl bg-zinc-950">
      <MapContainer 
        center={[50.0121, 22.6742]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        <MapController coords={userLocation} />

        {userLocation?.lat && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>Current Position</Popup>
            </Marker>
            <Circle 
              center={[userLocation.lat, userLocation.lng]}
              radius={radius || 10} 
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 }}
            />
          </>
        )}

        {Object.values(spots).map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]} 
            icon={DefaultIcon}
            opacity={unlockedSpots.includes(spot.id) ? 1 : 0.4}
          >
            <Popup>{spot.name}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Reverting to your previous status overlay style */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none">
        <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex justify-between items-center">
          <div className="text-white text-[10px] font-bold">
            {userLocation ? `GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'SCANNING...'}
          </div>
          <div className="text-emerald-500 font-black text-[10px] italic">{radius}M RANGE</div>
        </div>
      </div>
    </div>
  );
}
