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

  const updateNodeStreak = async (spotId, newStreakValue) => {
    if (!user) return;
    const safeVal = parseInt(newStreakValue, 10);
    const finalVal = isNaN(safeVal) ? 0 : Math.max(0, safeVal);

    const updatedStreaks = {
      ...(spotStreaks || {}),
      [spotId]: {
        ...(spotStreaks?.[spotId] || {}),
        streak: finalVal,
        last_claim: spotStreaks?.[spotId]?.last_claim || null
      }
    };
    
    setSpotStreaks(updatedStreaks);
    const { error } = await supabase.from('profiles')
      .update({ spot_streaks: updatedStreaks })
      .eq('id', user.id);

    if (error) {
      console.error("Streak save error:", error);
      showToast("Sync Failed", "error");
    }
  };

  const claimSpot = async (spotId) => {
    if (!user || !spots[spotId]) return;
    const today = new Date();
    const todayStr = today.toDateString();
    const currentStreaks = spotStreaks || {};
    const spotInfo = currentStreaks[spotId] || { last_claim: null, streak: 0 };

    if (spotInfo.last_claim && new Date(spotInfo.last_claim).toDateString() === todayStr) {
      return showToast("Already logged today", "error");
    }

    const earnedPoints = spots[spotId].points || 0;
    const newTotalPoints = (totalPoints || 0) + earnedPoints;
    const newUnlocked = unlockedSpots.includes(spotId) ? unlockedSpots : [...unlockedSpots, spotId];
    
    const newSpotStreaks = { 
      ...currentStreaks, 
      [spotId]: { 
        last_claim: today.toISOString(), 
        streak: (Number(spotInfo.streak) || 0) + 1 
      } 
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
    const newSpotStreaks = { ...(spotStreaks || {}) };
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
      showToast("Removed from Inventory");
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

  // --- UPDATED: Save Username with Reserved Check & Toast Engine ---
  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (!cleaned || cleaned === username) return;

    // 1. Check if name is taken by anyone else
    const { data: reserved } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', cleaned)
      .not('id', 'eq', user.id) // Crucial: don't check against yourself
      .maybeSingle();

    if (reserved) {
      // Triggers red Error Toast
      return showToast("Identity already reserved by another operative", "error");
    }

    // 2. Perform Update with 7-day timestamp
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ 
        username: cleaned, 
        last_username_change: now 
      })
      .eq('id', user.id);

    if (!error) {
      setUsername(cleaned);
      setLastChange(now);
      showToast("Identity Synchronized"); // Triggers green Success Toast
      fetchLeaderboard();
    } else {
      showToast("Update failed", "error");
    }
  };

  // --- UPDATED: Functional Admin Reset ---
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
