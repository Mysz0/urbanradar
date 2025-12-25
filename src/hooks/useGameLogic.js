import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useGameLogic(user, showToast) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });
  const [spotStreaks, setSpotStreaks] = useState({}); 
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [userRole, setUserRole] = useState('player');
  const [totalPoints, setTotalPoints] = useState(0);
  const [showEmail, setShowEmail] = useState(false);
  const [lastChange, setLastChange] = useState(null);
  const [customRadius, setCustomRadius] = useState(250);
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, total_points, unlocked_spots, visit_data')
        .order('total_points', { ascending: false })
        .limit(50);
      
      if (profiles) {
        const ranked = profiles.map(p => ({ 
          username: p.username || 'Anonymous', 
          score: p.total_points || 0, 
          found: (p.unlocked_spots || []).length, 
          streak: p.visit_data?.streak || 0 
        }));
        setLeaderboard(ranked);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const { data: dbSpots } = await supabase.from('spots').select('*');
        setSpots(dbSpots ? dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}) : {});

        let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (profile) {
          setUnlockedSpots(profile.unlocked_spots || []);
          setUsername(profile.username || '');
          setTempUsername(profile.username || '');
          setUserRole(profile.role || 'player');
          setTotalPoints(profile.total_points || 0);
          setShowEmail(profile.show_email ?? false);
          setLastChange(profile.last_username_change);
          setSpotStreaks(profile.spot_streaks || {});
          setCustomRadius(profile.custom_radius || 250);

          const now = new Date();
          const todayStr = now.toDateString();
          const dbVisitData = profile.visit_data || { last_visit: null, streak: 0 };
          
          let newStreak = dbVisitData.streak || 0;
          const lastVisitDate = dbVisitData.last_visit ? new Date(dbVisitData.last_visit) : null;

          if (!lastVisitDate) {
            newStreak = 1;
          } else {
            const lastVisitStr = lastVisitDate.toDateString();
            if (lastVisitStr !== todayStr) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (lastVisitStr === yesterday.toDateString()) {
                newStreak += 1;
              } else {
                newStreak = 1;
              }
            }
          }

          if (!lastVisitDate || lastVisitDate.toDateString() !== todayStr) {
            const updatedVisit = { last_visit: now.toISOString(), streak: newStreak };
            setVisitData(updatedVisit);
            await supabase.from('profiles').update({ visit_data: updatedVisit }).eq('id', user.id);
            showToast(`${newStreak} Day Streak Active!`);
          } else {
            setVisitData(dbVisitData);
          }
        }
        fetchLeaderboard();
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [user]);

  // --- HELPER: Get Multiplier Based on Day Count ---
  const getMultiplier = (days) => {
    if (days >= 10) return 1.5;
    if (days >= 7) return 1.3;
    if (days >= 3) return 1.1;
    return 1.0;
  };

  const updateNodeStreak = async (spotId, newStreakValue) => {
    if (!user) return;
    const safeVal = parseInt(newStreakValue, 10);
    const finalVal = isNaN(safeVal) ? 0 : Math.max(0, safeVal);
    
    const multiplier = getMultiplier(finalVal);
    const basePoints = spots[spotId]?.points || 0;
    const currentStreak = spotStreaks?.[spotId]?.streak || 0;
    
    let addedPoints = 0;
    if (finalVal > currentStreak) {
        addedPoints = Math.floor(basePoints * multiplier);
    }

    const updatedStreaks = {
      ...(spotStreaks || {}),
      [spotId]: {
        ...(spotStreaks?.[spotId] || {}),
        streak: finalVal,
        last_claim: spotStreaks?.[spotId]?.last_claim || null
      }
    };
    
    const newTotalPoints = totalPoints + addedPoints;
    setSpotStreaks(updatedStreaks);
    setTotalPoints(newTotalPoints);

    const { error } = await supabase.from('profiles')
      .update({ spot_streaks: updatedStreaks, total_points: newTotalPoints })
      .eq('id', user.id);

    if (error) {
      showToast("Sync Failed", "error");
    } else {
        showToast(`Streak Set: ${multiplier}x applied`);
        fetchLeaderboard();
    }
  };

  const claimSpot = async (userLocation) => {
    if (!user || !userLocation?.lat) return;

    // 1. Find all spots within the customRadius range
    const nearbySpots = Object.values(spots).filter(spot => {
      const distance = getDistance(
        userLocation.lat, 
        userLocation.lng, 
        spot.lat, 
        spot.lng
      );
      return distance <= (customRadius || 10);
    });

    if (nearbySpots.length === 0) {
      return showToast("No nodes in range", "error");
    }

    const today = new Date();
    const todayStr = today.toDateString();
    let totalEarned = 0;
    let claimCount = 0;
    
    const newUnlocked = [...unlockedSpots];
    const newSpotStreaks = { ...spotStreaks };

    // 2. Process each nearby spot
    nearbySpots.forEach(spot => {
      const spotInfo = newSpotStreaks[spot.id] || { last_claim: null, streak: 0 };
      
      // Skip if already claimed today
      if (spotInfo.last_claim && new Date(spotInfo.last_claim).toDateString() === todayStr) {
        return; 
      }

      const nextStreak = (Number(spotInfo.streak) || 0) + 1;
      const multiplier = getMultiplier(nextStreak);
      const earned = Math.floor((spot.points || 0) * multiplier);

      totalEarned += earned;
      claimCount++;

      // Update local tracking objects
      if (!newUnlocked.includes(spot.id)) newUnlocked.push(spot.id);
      newSpotStreaks[spot.id] = {
        last_claim: today.toISOString(),
        streak: nextStreak
      };
    });

    if (claimCount === 0) {
      return showToast("All nearby nodes already secured today", "error");
    }

    // 3. Sync everything to Supabase in one go
    const newTotalPoints = (totalPoints || 0) + totalEarned;

    const { error } = await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked, 
      spot_streaks: newSpotStreaks,
      total_points: newTotalPoints 
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setSpotStreaks(newSpotStreaks);
      setTotalPoints(newTotalPoints);
      
      showToast(`Secured ${claimCount} nodes: +${totalEarned} XP!`);
      fetchLeaderboard();
    }
  };

  // Helper function for distance calculation (Haversine formula)
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const removeSpot = async (id) => {
    if (!user) return;
    const newUnlocked = (unlockedSpots || []).filter(x => x !== id);
    const newSpotStreaks = { ...(spotStreaks || {}) };
    delete newSpotStreaks[id];

    const { error } = await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked, 
      spot_streaks: newSpotStreaks
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setSpotStreaks(newSpotStreaks);
      fetchLeaderboard();
      showToast("Node Cleared (XP Saved)");
    }
  };

  const addNewSpot = async (s) => { 
    const id = s.name.toLowerCase().replace(/\s+/g, '-'); 
    const { error } = await supabase.from('spots').insert([{ id, ...s }]); 
    if (!error) { setSpots(prev => ({ ...prev, [id]: { id, ...s } })); showToast("Deployed!"); }
  };

  const deleteSpotFromDB = async (id) => { 
    const { error } = await supabase.rpc('force_delete_spot', { target_id: id });
    if (!error) {
      setSpots(prev => {
        const n = {...prev};
        delete n[id];
        return n;
      });
      showToast("Global Purge Success");
    } else {
      showToast("Delete blocked by database rules", "error");
    }
  };

  const updateRadius = async (v) => { 
    const { error } = await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id); 
    if (!error) { setCustomRadius(v); showToast(`Radius: ${v}m`); }
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (!cleaned || cleaned === username) return;

    const { data: reserved } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', cleaned)
      .not('id', 'eq', user.id)
      .maybeSingle();

    if (reserved) {
      return showToast("Identity already reserved by another operative", "error");
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ username: cleaned, last_username_change: now })
      .eq('id', user.id);

    if (!error) {
      setUsername(cleaned);
      setLastChange(now);
      showToast("Identity Synchronized");
      fetchLeaderboard();
    } else {
      showToast("Update failed", "error");
    }
  };

  const resetTimer = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ last_username_change: null })
      .eq('id', user.id);

    if (!error) {
      setLastChange(null);
      showToast("Cooldown Bypassed: Instant Change Ready");
    } else {
      showToast("Override failed", "error");
    }
  };

  const toggleEmailVisibility = async () => {
    const newVal = !showEmail;
    const { error } = await supabase.from('profiles').update({ show_email: newVal }).eq('id', user.id);
    if (!error) { setShowEmail(newVal); showToast(newVal ? "Email Visible" : "Email Hidden"); }
  };

  return { 
    spots, unlockedSpots, visitData, spotStreaks, username, tempUsername, setTempUsername, 
    userRole, totalPoints, showEmail, lastChange, customRadius, leaderboard, 
    claimSpot, saveUsername, removeSpot, updateRadius, addNewSpot, deleteSpotFromDB,
    updateNodeStreak, fetchLeaderboard, resetTimer, toggleEmailVisibility
  };
}
