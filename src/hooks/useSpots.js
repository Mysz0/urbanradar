import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useSpots(user, showToast, totalPoints, setTotalPoints, fetchLeaderboard) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [spotStreaks, setSpotStreaks] = useState({});

  // --- INTERNAL HELPERS ---
  const getMultiplier = (days) => {
    if (days >= 10) return 1.5;
    if (days >= 7) return 1.3;
    if (days >= 3) return 1.1;
    return 1.0;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!user) return;

    const fetchSpotData = async () => {
      try {
        const { data: dbSpots } = await supabase.from('spots').select('*');
        setSpots(dbSpots ? dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}) : {});

        const { data: userClaimData } = await supabase
          .from('user_spots')
          .select('*')
          .eq('user_id', user.id);

        if (userClaimData) {
          const streakMap = {};
          const unlockedList = [];
          userClaimData.forEach((row) => {
            unlockedList.push(row.spot_id);
            streakMap[row.spot_id] = { streak: row.streak, last_claim: row.last_claim };
          });
          setUnlockedSpots(unlockedList);
          setSpotStreaks(streakMap);
        }
      } catch (err) {
        console.error("Spot Data Fetch Error:", err);
      }
    };

    fetchSpotData();
  }, [user]);

  const claimSpot = async (input, customRadius) => {
    if (!user) return;
    const todayStr = new Date().toDateString();
    let spotsToClaim = [];

    // Identify which spots are being interacted with
    if (typeof input === 'object' && input.lat && input.lng) {
      spotsToClaim = Object.values(spots).filter(spot => 
        getDistance(input.lat, input.lng, spot.lat, spot.lng) <= (customRadius || 250)
      );
    } else if (typeof input === 'string' && spots[input]) {
      spotsToClaim = [spots[input]];
    }

    if (spotsToClaim.length === 0) return showToast("No nodes in range", "error");

    let totalEarned = 0;
    let claimCount = 0;
    const upsertRows = [];
    
    // CLONE arrays and objects for immutability
    const newSpotStreaks = { ...spotStreaks };
    const newUnlocked = [...unlockedSpots];

    spotsToClaim.forEach(spot => {
      const info = spotStreaks[spot.id] || { last_claim: null, streak: 0 };
      
      // Skip if already claimed today
      if (info.last_claim && new Date(info.last_claim).toDateString() === todayStr) return;

      const nextStreak = (Number(info.streak) || 0) + 1;
      const multiplier = getMultiplier(nextStreak);
      const earned = Math.floor((spot.points || 0) * multiplier);

      totalEarned += earned;
      claimCount++;

      if (!newUnlocked.includes(spot.id)) {
        newUnlocked.push(spot.id);
      }
      
      const claimTimestamp = new Date().toISOString();
      newSpotStreaks[spot.id] = { last_claim: claimTimestamp, streak: nextStreak };
      
      upsertRows.push({
        user_id: user.id,
        spot_id: spot.id,
        streak: nextStreak,
        last_claim: claimTimestamp
      });
    });

    if (claimCount === 0) return showToast("Nodes already secured today", "error");

    // 1. Update Database (User Spots)
    const { error: upsertError } = await supabase
      .from('user_spots')
      .upsert(upsertRows, { onConflict: 'user_id, spot_id' });

    if (upsertError) {
      console.error("Upsert Error:", upsertError);
      return showToast("Sync Error", "error");
    }

    // 2. Update Database (Profile Points)
    const newTotalPoints = (totalPoints || 0) + totalEarned;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        total_points: newTotalPoints,
        // Optional: you can sync unlocked_spots here if your schema uses it, 
        // but the 'user_spots' table is the primary source of truth.
      })
      .eq('id', user.id);

    if (profileError) {
      console.error("Profile Update Error:", profileError);
      return showToast("Profile Sync Error", "error");
    }

    // 3. FORCE REACTIVE UI UPDATE
    // We update state AFTER DB success but BEFORE waiting for any re-fetches
    setUnlockedSpots([...newUnlocked]); // New array reference forces re-render
    setSpotStreaks({...newSpotStreaks}); // New object reference forces re-render
    setTotalPoints(newTotalPoints);

    showToast(`Secured ${claimCount} nodes: +${totalEarned} XP!`, "success");
    
    if (fetchLeaderboard) fetchLeaderboard();
  };

  const removeSpot = async (id) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_spots')
      .delete()
      .eq('user_id', user.id)
      .eq('spot_id', id);

    if (!error) {
      const newUnlocked = unlockedSpots.filter(x => x !== id);
      setUnlockedSpots([...newUnlocked]);
      setSpotStreaks(prev => {
        const next = { ...prev };
        delete next[id];
        return { ...next };
      });
      showToast("Node Cleared");
    }
  };

  return {
    spots,
    setSpots,
    unlockedSpots,
    spotStreaks,
    setSpotStreaks,
    claimSpot,
    removeSpot,
    getMultiplier
  };
}
