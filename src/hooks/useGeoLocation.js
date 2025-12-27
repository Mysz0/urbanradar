import { useState, useEffect, useRef } from 'react';
import { getDistance } from '../utils/geoUtils'; 
import { supabase } from '../supabase';

export function useGeoLocation(user, spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [radiusBonus, setRadiusBonus] = useState(0);
  
  // Use a ref for spots to avoid re-triggering the watch unnecessarily 
  // if spots object reference changes but content doesn't
  const spotsRef = useRef(spots);
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  useEffect(() => {
    if (!user) return;

    const fetchUpgrades = async () => {
      const { data } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (data) {
        const radiusBoosts = data.filter(inv => inv.shop_items?.icon_name === 'Maximize');
        const totalBonus = radiusBoosts.reduce((acc, inv) => {
          return acc + (inv.shop_items?.effect_value || inv.shop_items?.bonus_value || 30);
        }, 0);
        setRadiusBonus(totalBonus);
      }
    };

    fetchUpgrades();

    const subscription = supabase
      .channel('inventory_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_inventory',
        filter: `user_id=eq.${user.id}`
      }, () => fetchUpgrades())
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [user]);

  useEffect(() => {
    const DETECTION_RANGE = (customRadius || 250) + radiusBonus; 
    const CLAIM_RANGE = (claimRadius || 20) + radiusBonus; 
    const todayStr = new Date().toDateString();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Shake-proofing with higher precision
        const coords = { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        };

        // Update location state immediately
        setUserLocation(coords);

        // Proximity calculation
        let readySpot = null;
        let closestReadyDist = Infinity;
        let securedSpot = null;
        let closestSecuredDist = Infinity;
        let foundClaimable = false;

        const currentSpots = spotsRef.current || {};

        Object.values(currentSpots).forEach(spot => {
          const dist = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
          const streakInfo = spotStreaks[spot.id];
          const isLoggedToday = streakInfo?.last_claim && 
                               new Date(streakInfo.last_claim).toDateString() === todayStr;

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
      (err) => {
        // Log instead of error to prevent crashing the UI experience
        console.warn(`Geolocation error (${err.code}): ${err.message}`);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 1000, // Allow 1 second old cache for smoother movement
        timeout: 10000    // Increased to 10s to give the hardware breathing room
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // Removed spots from dependency array to prevent watch restart loops
    // using spotsRef instead inside the callback
  }, [customRadius, claimRadius, spotStreaks, radiusBonus]);

  return { 
    userLocation, 
    mapCenter: [50.0121, 22.6742], 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId,
    radiusBonus
  };
}
