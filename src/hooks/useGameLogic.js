import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useGameLogic(user, showToast) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });
  const [spotStreaks, setSpotStreaks] = useState({}); 
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [userRole, setUserRole] = useState('player'); // NEW: Database-driven role
  const [showEmail, setShowEmail] = useState(false);
  const [lastChange, setLastChange] = useState(null);
  const [customRadius, setCustomRadius] = useState(250); // Default to 250m
  const [leaderboard, setLeaderboard] = useState([]);

  // --- LEADERBOARD LOGIC ---
  const fetchLeaderboard = async (currentSpots) => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, unlocked_spots, visit_data');
      
      if (profiles && currentSpots) {
        const ranked = profiles.map(p => {
          const streak = p.visit_data?.streak || 0;
          const multiplier = streak > 1 ? 1.1 : 1.0;
          const score = (p.unlocked_spots || []).reduce((sum, id) => {
            const basePoints = currentSpots[id]?.points || 0;
            return sum + Math.round(basePoints * multiplier);
          }, 0);
          return { 
            username: p.username || 'Anonymous', 
            score, 
            found: (p.unlocked_spots || []).length, 
            streak 
          };
        }).sort((a, b) => b.score - a.score);
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
        // 1. Fetch All World Spots
        const { data: dbSpots } = await supabase.from('spots').select('*');
        const spotsObj = dbSpots ? dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}) : {};
        setSpots(spotsObj);

        // 2. Fetch User Profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // 3. Create Profile if it doesn't exist
        if (!profile) {
          const fallbackName = user.user_metadata?.full_name || 
                               user.user_metadata?.user_name || 
                               `Hunter_${user.id.substring(0, 4)}`;

          const { data: created } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              username: fallbackName,
              role: 'player', // Default role for new signups
              unlocked_spots: [],
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
          setUserRole(profile.role || 'player'); // NEW: Set role from DB
          setShowEmail(profile.show_email ?? false);
          setLastChange(profile.last_username_change);
          setVisitData(profile.visit_data || { last_visit: null, streak: 0 });
          setSpotStreaks(profile.spot_streaks || {});
          setCustomRadius(profile.custom_radius || 250);
        }
        
        fetchLeaderboard(spotsObj);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    
    fetchData();
  }, [user]);

  // --- GAMEPLAY ACTIONS ---
  const claimSpot = async (spotId) => {
    if (!user) return;
    
    const today = new Date();
    const todayStr = today.toDateString();
    
    const currentStreaks = spotStreaks || {};
    const spotInfo = currentStreaks[spotId] || { last_claim: null, streak: 0 };
    const lastSpotClaimDate = spotInfo.last_claim ? new Date(spotInfo.last_claim).toDateString() : null;

    if (lastSpotClaimDate === todayStr) {
      return showToast("Already logged this spot today", "error");
    }

    // Global Activity Streak Logic
    const lastGlobalVisit = visitData?.last_visit ? new Date(visitData.last_visit).toDateString() : null;
    let newGlobalStreak = visitData?.streak || 1;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastGlobalVisit === yesterdayStr) {
      newGlobalStreak += 1;
    } else if (lastGlobalVisit !== todayStr) {
      newGlobalStreak = 1;
    }

    // Individual Spot Streak Logic
    let newSpotStreak = (spotInfo.streak || 0) + 1;
    if (lastSpotClaimDate && lastSpotClaimDate !== yesterdayStr && lastSpotClaimDate !== todayStr) {
      newSpotStreak = 1; 
    }

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
      spot_streaks: newSpotStreaks
    }).eq('id', user.id);

    if (!error) {
      setUnlockedSpots(newUnlocked);
      setVisitData(newVisitData);
      setSpotStreaks(newSpotStreaks);
      fetchLeaderboard(spots);
      showToast(isFirstDiscovery ? "New Node Found!" : `Node Re-logged! (${newSpotStreak}x Streak)`);
    }
  };

  // --- ADMIN & PROFILE ACTIONS ---
  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (cleaned.length < 3) return showToast("Name too short", "error");
    const { error } = await supabase.from('profiles')
      .update({ username: cleaned, last_username_change: new Date().toISOString() })
      .eq('id', user.id);
    
    if (!error) {
      setUsername(cleaned); setLastChange(new Date().toISOString());
      showToast("Identity updated!"); fetchLeaderboard(spots);
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
    setUnlockedSpots(newUnlocked); setSpotStreaks(newSpotStreaks); fetchLeaderboard(spots);
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
    userRole, // EXPOSED: Now used in App.jsx for isAdmin check
    showEmail, lastChange, customRadius, leaderboard, 
    claimSpot, saveUsername, removeSpot, updateRadius, addNewSpot, deleteSpotFromDB,
    fetchLeaderboard 
  };
}
