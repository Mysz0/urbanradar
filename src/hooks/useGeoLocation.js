import { useState, useEffect } from 'react';
import { getDistance } from '../utils/geoUtils'; 


export function useGeoLocation(spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [mapCenter] = useState([50.0121, 22.6742]);

  useEffect(() => {
    // 1. DYNAMIC RADIUS LIMITS
    const DETECTION_RANGE = customRadius || 250; 
    const CLAIM_RANGE = claimRadius || 20; 
    
    const todayStr = new Date().toDateString();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // 2. SHAKE-PROOFING: Rounding to 6 decimal places
        const coords = { 
          lat: Math.round(pos.coords.latitude * 1000000) / 1000000, 
          lng: Math.round(pos.coords.longitude * 1000000) / 1000000 
        };
        setUserLocation(coords);

        let readySpot = null;
        let closestReadyDist = Infinity;
        
        let securedSpot = null;
        let closestSecuredDist = Infinity;

        let foundClaimable = false;

        Object.values(spots).forEach(spot => {
          const dist = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
          const streakInfo = spotStreaks[spot.id];
          const isLoggedToday = streakInfo?.last_claim && new Date(streakInfo.last_claim).toDateString() === todayStr;

          // 3. DETECTION LOGIC (Controls Home Tab appearance)
          if (dist <= DETECTION_RANGE) {
            if (!isLoggedToday) {
              if (dist < closestReadyDist) {
                closestReadyDist = dist;
                readySpot = spot.id;
              }
            } else {
              if (dist < closestSecuredDist) {
                closestSecuredDist = dist;
                securedSpot = spot.id;
              }
            }
          }

          // 4. CLAIM LOGIC (Controls "Claim" button availability)
        
          if (dist <= CLAIM_RANGE && !isLoggedToday) {
            foundClaimable = true;
          }
        });

        // Determine which spot UI should focus on
        const activeId = readySpot || securedSpot;

        setProximity({ 
          isNear: !!activeId, 
          canClaim: foundClaimable, 
          spotId: activeId 
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
  }, [spots, customRadius, claimRadius, spotStreaks]);

  return { 
    userLocation, 
    mapCenter, 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId 
  };
}
