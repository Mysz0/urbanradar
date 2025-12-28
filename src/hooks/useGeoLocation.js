import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from '../utils/geoUtils'; 
import { supabase } from '../supabase';

export function useGeoLocation(user, spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [radiusBonus, setRadiusBonus] = useState(0);
  
  const spotsRef = useRef(spots);
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  // --- 1. RADIUS UPGRADES (The Realtime Fix) ---
  const fetchUpgrades = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_inventory')
      .select('*, shop_items(*)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching upgrades:", error);
      return;
    }

    if (data) {
      const totalBonus = data.reduce((acc, inv) => {
        // Checking multiple possible field names to be safe
        const val = inv.shop_items?.value || inv.shop_items?.effect_value || inv.shop_items?.bonus_value || 0;
        if (inv.shop_items?.type === 'range_boost' || inv.shop_items?.icon_name === 'Maximize') {
          return acc + val;
        }
        return acc;
      }, 0);
      
      setRadiusBonus(totalBonus);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUpgrades();

    // broad subscription to ensure we catch the 'UPDATE' from the store/inventory
    const channel = supabase
      .channel(`inventory_changes_${user.id}`)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'user_inventory'
      }, (payload) => {
        // When database changes, re-fetch immediately
        fetchUpgrades();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUpgrades]);

  // --- 2. CORE CALCULATION LOGIC ---
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

  // --- 3. GEOLOCATION WATCHER ---
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        checkProximity(coords); 
      },
      (err) => console.warn(err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [checkProximity]);

  // Re-calculate proximity if bonus changes while standing still
  useEffect(() => {
    if (userLocation) checkProximity(userLocation);
  }, [radiusBonus, userLocation, checkProximity]);

  return { 
    userLocation, 
    mapCenter: [50.0121, 22.6742], 
    isNearSpot: proximity.isNear, 
    canClaim: proximity.canClaim, 
    activeSpotId: proximity.spotId,
    radiusBonus
  };
}
