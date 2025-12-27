import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from '../utils/geoUtils'; 
import { supabase } from '../supabase';

export function useGeoLocation(user, spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [radiusBonus, setRadiusBonus] = useState(0);
  
  // Ref helps prevent the geolocation watch from restarting constantly
  const spotsRef = useRef(spots);
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  // --- 1. CORE CALCULATION LOGIC ---
  const checkProximity = useCallback((coords) => {
    if (!coords) return;

    const DETECTION_RANGE = (customRadius || 250) + radiusBonus; 
    const CLAIM_RANGE = (claimRadius || 20) + radiusBonus; 
    const todayStr = new Date().toDateString();

    let readySpot = null;
    let closestReadyDist = Infinity;
    let securedSpot = null;
    let closestSecuredDist = Infinity;
    let foundClaimable = false;

    // We use the most recent spots data
    const currentSpots = spots || {};

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
  }, [spots, customRadius, claimRadius, spotStreaks, radiusBonus]);

  // --- 2. RADIUS UPGRADES ---
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
      .channel('inventory_geo')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_inventory',
        filter: `user_id=eq.${user.id}`
      }, () => fetchUpgrades())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user]);

  // --- 3. GEOLOCATION WATCHER ---
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        };
        setUserLocation(coords);
        checkProximity(coords); // Run calculation on movement
      },
      (err) => console.warn(`Geolocation error: ${err.message}`),
      { 
        enableHighAccuracy: true, 
        maximumAge: 1000, 
        timeout: 10000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [checkProximity]);

  // --- 4. DYNAMIC UPDATE: RE-CALCULATE WHEN SPOTS CHANGE ---
  // This is the fix for instant updates while standing still
  useEffect(() => {
    if (userLocation) {
      checkProximity(userLocation);
    }
  }, [spots, checkProximity, userLocation]);

  return { 
    userLocation, 
    mapCenter: [50.0121, 22.6742], 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId,
    radiusBonus
  };
}
