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

  // --- LEADERBOARD LOGIC ---
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
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    }
  };

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: dbSpots } = await supabase.from('spots').select('*');
        const spotsObj = dbSpots ? dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}) : {};
        setSpots(spotsObj);

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          const fallbackName = user.user_metadata?.full_name || 
                               user.user_metadata?.user_name || 
                               `Hunter_${user.id.substring(0, 4)}`;

          const { data: created } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              username: fallbackName,
              role: 'player',
              unlocked_spots: [],
              total_points: 0,
              custom_radius: 250,
              visit_data: { last_visit: null, streak: 0 },
              spot_streaks: {} 
            }])
            .select()
            .single();
          profile = created;
        }

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
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    
    fetchData();
  }, [user]);

  // --- GAMEPLAY ACTIONS ---
  const claimSpot = async (spotId) => {
    if (!user || !spots[spotId]) return;
    
    const today = new Date();
    const todayStr = today.toDateString();
    const currentStreaks = spotStreaks || {};
    const spotInfo = currentStreaks[spotId] || { last_claim: null, streak: 0 };
    const lastSpotClaimDate = spotInfo.last_claim ? new Date(spotInfo.last_claim).toDateString() : null;

    if (lastSpotClaimDate === todayStr) {
      return showToast("Already logged this spot today", "error");
    }

    // 1. GLOBAL STREAK LOGIC
    const lastGlobalVisit = visitData?.last_visit ? new Date(visitData.last_visit).toDateString() : null;
    let newGlobalStreak = visitData?.streak || 1;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastGlobalVisit === yesterdayStr) {
      newGlobalStreak += 1;
    } else if (lastGlobalVisit !== todayStr) {
      newGlobalStreak = 1;
    }

    // 2. PROGRESSIVE MULTIPLIER TIER
    let multiplier = 1.0;
    if (newGlobalStreak >= 7) multiplier = 1.5;
    else if (newGlobalStreak >= 5) multiplier = 1.3;
    else if (newGlobalStreak >= 2) multiplier = 1.1;

    // 3. INDIVIDUAL SPOT STREAK
    let newSpotStreak = (spotInfo.streak || 0) + 1;
    if (lastSpotClaimDate && lastSpotClaimDate !== yesterdayStr && lastSpotClaimDate !== todayStr) {
      newSpotStreak = 1; 
    }

    // 4. POINT CALCULATION
    const basePoints = spots[spotId].points || 0;
    const earnedPoints = Math.round(basePoints * multiplier);
    const newTotalPoints = (totalPoints || 0) + earnedPoints;

    const isFirstDiscovery = !unlockedSpots.includes(spotId);
    const newUnlocked = isFirstDiscovery ? [...unlockedSpots, spotId] : unlockedSpots;
    const newVisitData = { last_visit: today.toISOString(), streak: newGlobalStreak };
    const newSpotStreaks = { 
      ...currentStreaks, 
      [spotId]: { last_claim: today.toISOString(), streak: newSpotStreak } 
    };

    const { error } = await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked, 
      visit_data: newVisitData,
      spot_streaks: newSpotStreaks,
      total_points: newTotalPoints 
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setVisitData(newVisitData);
      setSpotStreaks(newSpotStreaks);
      setTotalPoints(newTotalPoints);
      fetchLeaderboard();
      
      const bonusMsg = multiplier > 1 ? ` (${multiplier}x Streak Bonus!)` : '';
      showToast(`${isFirstDiscovery ? "New Node!" : "Check-in!"} +${earnedPoints} pts${bonusMsg}`);
    }
  };

  // --- ADMIN & PROFILE ACTIONS ---

  // Manual streak override for Admin console
  const updateNodeStreak = async (spotId, newStreakValue) => {
    if (!user) return;
    
    const current = spotStreaks || {};
    const numericStreak = parseInt(newStreakValue) || 0;
    
    const newStreaks = {
      ...current,
      [spotId]: { 
        ...current[spotId], 
        streak: numericStreak,
        // If we set a streak > 0, ensure it has a valid claim date
        last_claim: current[spotId]?.last_claim || new Date().toISOString()
      }
    };

    const { error } = await supabase.from('profiles')
      .update({ spot_streaks: newStreaks })
      .eq('id', user.id);

    if (!error) {
      setSpotStreaks(newStreaks);
      showToast(`Node streak updated to ${numericStreak}`, "success");
    } else {
      showToast("Failed to update streak", "error");
    }
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (cleaned.length < 3) return showToast("Name too short", "error");
    const { error } = await supabase.from('profiles')
      .update({ username: cleaned, last_username_change: new Date().toISOString() })
      .eq('id', user.id);
    
    if (!error) {
      setUsername(cleaned); setLastChange(new Date().toISOString());
      showToast("Identity updated!"); fetchLeaderboard();
    }
  };

  const updateRadius = async (v) => { 
    const { error } = await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id); 
    if (!error) { setCustomRadius(v); showToast(`Detection range: ${v}m`, "success"); }
  };

  const removeSpot = async (id) => {
    const newUnlocked = (unlockedSpots || []).filter(x => x !== id);
    const newSpotStreaks = { ...(spotStreaks || {}) };
    delete newSpotStreaks[id];
    await supabase.from('profiles').update({ unlocked_spots: newUnlocked, spot_streaks: newSpotStreaks }).eq('id', user.id);
    setUnlockedSpots(newUnlocked); setSpotStreaks(newSpotStreaks); fetchLeaderboard();
  };

  const addNewSpot = async (s) => { 
    const id = s.name.toLowerCase().replace(/\s+/g, '-'); 
    const { error } = await supabase.from('spots').insert([{ id, ...s }]); 
    if (!error) { setSpots(prev => ({ ...prev, [id]: { id, ...s } })); showToast(`${s.name} added!`); }
  };

  const deleteSpotFromDB = async (id) => { 
    await supabase.from('spots').delete().eq('id', id); 
    const n = {...spots}; delete n[id]; setSpots(n); 
  };

  return { 
    spots, unlockedSpots, visitData, spotStreaks,
    username, tempUsername, setTempUsername, 
    userRole, totalPoints,
    showEmail, lastChange, customRadius, leaderboard, 
    claimSpot, saveUsername, removeSpot, updateRadius, addNewSpot, deleteSpotFromDB,
    updateNodeStreak, // Exported for AdminTab
    fetchLeaderboard 
  };
}
