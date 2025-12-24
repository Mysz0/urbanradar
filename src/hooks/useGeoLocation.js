import { useState, useEffect } from 'react';
import { getDistance } from '../utils/geoUtils'; 

export function useGeoLocation(spots, customRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  // Map starts at a default, but ExploreTab usually flies to userLocation
  const [mapCenter] = useState([40.730610, -73.935242]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);

        let foundNear = false;
        let foundClaimable = false;
        let foundId = null;

        Object.values(spots).forEach(spot => {
          const dist = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
          
          // 1. Detection Range (250m) - Shows the spot in the UI
          if (dist <= 250) {
            foundNear = true;
            foundId = spot.id;
          }
          
          // 2. Claim Range (10m or Custom Radius) - Enables the button
          // Using 10m as the hard limit you requested
          if (dist <= 10) {
            foundClaimable = true;
          }
        });

        setProximity({ 
          isNear: foundNear, 
          canClaim: foundClaimable, 
          spotId: foundId 
        });
      },
      (err) => console.error("Geo Error:", err),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [spots, customRadius]);

  return { 
    userLocation, 
    mapCenter, 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, // New property
    activeSpotId: proximity.spotId 
  };
}
