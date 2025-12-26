import { useState, useEffect } from 'react';
import { getDistance } from '../utils/geoUtils'; 
import { supabase } from '../supabase';

export function useGeoLocation(user, spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [mapCenter] = useState([50.0121, 22.6742]);
  const [radiusBonus, setRadiusBonus] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch active radius upgrades from inventory
    const fetchUpgrades = async () => {
      const { data } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('shop_items.category', 'upgrade');

      if (data) {
        // Sum up all active radius bonuses
        const totalBonus = data.reduce((acc, inv) => acc + (inv.shop_items.effect_value || 0), 0);
        setRadiusBonus(totalBonus);
      }
    };

    fetchUpgrades();
  }, [user]);

  useEffect(() => {
    // 1. DYNAMIC RADIUS LIMITS + UPGRADE BONUS
    const DETECTION_RANGE = (customRadius || 250) + radiusBonus; 
    const CLAIM_RANGE = (claimRadius || 20) + radiusBonus; 
    
    const todayStr = new Date().toDateString();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // 2. SHAKE-PROOFING
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

          // 3. DETECTION LOGIC
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

          // 4. CLAIM LOGIC
          if (dist <= CLAIM_RANGE && !isLoggedToday) {
            foundClaimable = true;
          }
        });

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
  }, [spots, customRadius, claimRadius, spotStreaks, radiusBonus]);

  return { 
    userLocation, 
    mapCenter, 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId,
    radiusBonus // Exporting this so you can show the boosted range on the UI/Map if needed
  };
}
