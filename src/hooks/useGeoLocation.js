import { useState, useEffect } from 'react';
import { getDistance } from '../utils/geoUtils'; // Ensure path is correct

export function useGeoLocation(spots, customRadius) {
  const [userLocation, setUserLocation] = useState(null);
  const [proximity, setProximity] = useState({ isNear: false, spotId: null });
  const [mapCenter] = useState([40.730610, -73.935242]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);

        // Check proximity against all spots
        let foundNear = false;
        let foundId = null;

        Object.values(spots).forEach(spot => {
          const dist = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
          if (dist <= (customRadius || 0.25)) {
            foundNear = true;
            foundId = spot.id;
          }
        });

        setProximity({ isNear: foundNear, spotId: foundId });
      },
      null,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [spots, customRadius]);

  return { userLocation, mapCenter, isNearSpot: proximity.isNear, activeSpotId: proximity.spotId };
}
