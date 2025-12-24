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
          setVisitData(profile.visit_data || { last_visit: null, streak: 0 });
          setSpotStreaks(profile.spot_streaks || {});
          setCustomRadius(profile.custom_radius || 250);
        }
        fetchLeaderboard();
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [user]);

  // --- STREAK EDITOR (ADMIN TAB FIX) ---
  const updateNodeStreak = async (spotId, newStreakValue) => {
    if (!user) return;
    const safeVal = Math.max(0, parseInt(newStreakValue) || 0);

    // 1. Prepare the updated object
    const updatedStreaks = {
      ...(spotStreaks || {}),
      [spotId]: {
        ...(spotStreaks?.[spotId] || {}),
        streak: safeVal,
        last_claim: spotStreaks?.[spotId]?.last_claim || new Date().toISOString()
      }
    };
    
    // 2. Optimistic Update
    setSpotStreaks(updatedStreaks);

    // 3. Save to DB
    const { error } = await supabase.from('profiles')
      .update({ spot_streaks: updatedStreaks })
      .eq('id', user.id);

    if (error) {
      showToast("Streak sync failed", "error");
      setSpotStreaks(spotStreaks); // Rollback
    }
  };

  const claimSpot = async (spotId) => {
    if (!user || !spots[spotId]) return;
    const today = new Date();
    const todayStr = today.toDateString();
    const spotInfo = spotStreaks[spotId] || { last_claim: null, streak: 0 };

    if (spotInfo.last_claim && new Date(spotInfo.last_claim).toDateString() === todayStr) {
      return showToast("Already logged today", "error");
    }

    const earnedPoints = spots[spotId].points || 0;
    const newTotalPoints = (totalPoints || 0) + earnedPoints;
    const newUnlocked = unlockedSpots.includes(spotId) ? unlockedSpots : [...unlockedSpots, spotId];
    
    const newSpotStreaks = { 
      ...spotStreaks, 
      [spotId]: { last_claim: today.toISOString(), streak: (spotInfo.streak || 0) + 1 } 
    };

    const { error } = await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked, 
      spot_streaks: newSpotStreaks,
      total_points: newTotalPoints 
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setSpotStreaks(newSpotStreaks);
      setTotalPoints(newTotalPoints);
      showToast(`+${earnedPoints} pts!`);
      fetchLeaderboard();
    }
  };

  const removeSpot = async (id) => {
    if (!user) return;
    const spotValue = spots[id]?.points || 0;
    const newTotalPoints = Math.max(0, totalPoints - spotValue);
    const newUnlocked = (unlockedSpots || []).filter(x => x !== id);
    const newSpotStreaks = { ...spotStreaks };
    delete newSpotStreaks[id];

    const { error } = await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked, 
      spot_streaks: newSpotStreaks,
      total_points: newTotalPoints 
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setSpotStreaks(newSpotStreaks);
      setTotalPoints(newTotalPoints);
      fetchLeaderboard();
      showToast("Node & points removed");
    }
  };

  const addNewSpot = async (s) => { 
    const id = s.name.toLowerCase().replace(/\s+/g, '-'); 
    const { error } = await supabase.from('spots').insert([{ id, ...s }]); 
    if (!error) { setSpots(prev => ({ ...prev, [id]: { id, ...s } })); showToast("Deployed!"); }
  };

  const deleteSpotFromDB = async (id) => { 
    try {
      // 1. First, tell Supabase to remove this ID from EVERY user's array in the profiles table
      // We do this via a manual update call to clear the "blockers"
      await supabase.rpc('remove_spot_from_all_profiles', { spot_id: id });

      // 2. Now delete the actual spot from the spots table
      const { error } = await supabase.from('spots').delete().eq('id', id); 
      
      if (!error) {
        setSpots(prev => { const n = {...prev}; delete n[id]; return n; });
        showToast("Purged from DB");
      } else {
        // If it still fails, it's the constraint issue
        showToast("Delete blocked. Run the SQL script I gave you!", "error");
      }
    } catch (err) {
      // If the RPC above doesn't exist yet, we fall back to a simple delete
      const { error } = await supabase.from('spots').delete().eq('id', id);
      if (error) showToast("Database still protected. Use SQL Editor.", "error");
    }
  };
  

  const updateRadius = async (v) => { 
    const { error } = await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id); 
    if (!error) { setCustomRadius(v); showToast(`Radius: ${v}m`); }
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    const { error } = await supabase.from('profiles').update({ username: cleaned }).eq('id', user.id);
    if (!error) { setUsername(cleaned); showToast("Updated!"); fetchLeaderboard(); }
  };

  return { 
    spots, unlockedSpots, visitData, spotStreaks, username, tempUsername, setTempUsername, 
    userRole, totalPoints, showEmail, lastChange, customRadius, leaderboard, 
    claimSpot, saveUsername, removeSpot, updateRadius, addNewSpot, deleteSpotFromDB,
    updateNodeStreak, fetchLeaderboard, resetTimer: () => showToast("Bypassed")
  };
}
