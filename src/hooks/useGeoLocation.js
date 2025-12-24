import { useState, useEffect } from 'react';
import { getDistance } from '../utils/geoUtils'; 

export function useGeoLocation(spots, customRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  // Set a sensible default for map if location isn't available yet
  const [mapCenter] = useState([50.0121, 22.6742]);

  useEffect(() => {
    // Determine the detection range: Use database value or default to 250
    const detectionRange = customRadius || 250;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);

        let foundNear = false;
        let foundClaimable = false;
        let foundId = null;
        let closestDist = Infinity;

        Object.values(spots).forEach(spot => {
          const dist = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
          
          // 1. DYNAMIC DETECTION: Use the radius from DB/Admin
          if (dist <= detectionRange) {
            // We want to track the ABSOLUTE closest spot if multiple are in range
            if (dist < closestDist) {
              closestDist = dist;
              foundNear = true;
              foundId = spot.id;
            }
          }
          
          // 2. CLAIM RANGE: Hard limit of 10m for actual point collection
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
      (err) => console.error("GPS Signal Lost:", err),
      { 
        enableHighAccuracy: true, 
        maximumAge: 0,
        timeout: 5000 
      }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [spots, customRadius]); // Re-runs logic if admin changes radius in DB

  return { 
    userLocation, 
    mapCenter, 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId 
  };
}
