import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance } from '../utils/geoUtils'; 
import { supabase } from '../supabase';

export function useGeoLocation(user, spots, customRadius, spotStreaks = {}, claimRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, canClaim: false, spotId: null });
  const [radiusBonus, setRadiusBonus] = useState(0);
  const lastLocationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const errorLoggedRef = useRef(false);
  
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

  // --- 3. GEOLOCATION WATCHER WITH ANTI-SPOOF ---
  useEffect(() => {
    let watchId = null;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const now = Date.now();
        
        // Anti-spoof validation
        if (lastLocationRef.current) {
          const timeDiff = (now - lastUpdateRef.current) / 1000; // seconds
          const distance = getDistance(
            lastLocationRef.current.lat, 
            lastLocationRef.current.lng,
            coords.lat, 
            coords.lng
          );
          
          // Max human speed: ~10 m/s (running), planes ~250 m/s
          // If someone "moved" faster than 50 m/s, likely spoofing
          const speed = distance / timeDiff;
          if (speed > 50 && timeDiff > 1) {
            console.warn('⚠️ Suspicious location change detected. Movement too fast:', Math.round(speed), 'm/s');
            // Don't update location if teleportation detected
            return;
          }
          
          // Check accuracy - if accuracy suddenly becomes perfect (0-5m), might be spoofed
          if (pos.coords.accuracy < 5 && lastLocationRef.current.accuracy > 20) {
            console.warn('⚠️ Suspicious accuracy improvement detected');
          }
        }
        
        lastLocationRef.current = { ...coords, accuracy: pos.coords.accuracy };
        lastUpdateRef.current = now;
        setUserLocation(coords);
        checkProximity(coords);
      },
      (err) => {
        // Only log error once to prevent console spam
        if (!errorLoggedRef.current) {
          errorLoggedRef.current = true;
          if (err.code === 1) {
            console.warn('Location access denied. Enable location permissions to use this feature.');
          } else if (err.code === 2) {
            console.warn('Location unavailable. Check device GPS settings.');
          } else if (err.code === 3) {
            console.warn('Location request timed out.');
          }
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
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
