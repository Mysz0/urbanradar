import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useGameLogic(user, showToast) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });
  const [spotStreaks, setSpotStreaks] = useState({}); // Tracking streaks per individual spot
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [lastChange, setLastChange] = useState(null);
  const [customRadius, setCustomRadius] = useState(50);
  const [leaderboard, setLeaderboard] = useState([]);

  // --- LEADERBOARD LOGIC ---
  const fetchLeaderboard = async (currentSpots) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, unlocked_spots, visit_data');
    
    if (profiles) {
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
  };

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
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

      if (!profile) {
        const fallbackName = user.user_metadata?.full_name || 
                             user.user_metadata?.user_name || 
                             `Hunter_${user.id.substring(0, 4)}`;

        const { data: created } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: fallbackName,
            unlocked_spots: [],
            custom_radius: 50,
            visit_data: { last_visit: null, streak: 0 },
            spot_streaks: {} // Initialize empty streaks
          }])
          .select()
          .single();
        profile = created;
      }

      if (profile) {
        setUnlockedSpots(profile.unlocked_spots || []);
        setUsername(profile.username || '');
        setTempUsername(profile.username || '');
        setShowEmail(profile.show_email ?? false);
        setLastChange(profile.last_username_change);
        setVisitData(profile.visit_data || { last_visit: null, streak: 0 });
        setSpotStreaks(profile.spot_streaks || {});
        setCustomRadius(profile.custom_radius || 50);
      }
      
      fetchLeaderboard(spotsObj);
    };
    
    fetchData();
  }, [user]);

  // --- GAMEPLAY ACTIONS ---
  const claimSpot = async (spotId) => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    // 1. Check if this specific spot was already claimed TODAY
    const spotInfo = spotStreaks[spotId] || { last_claim: null, streak: 0 };
    const lastSpotClaimDate = spotInfo.last_claim ? new Date(spotInfo.last_claim).toDateString() : null;

    if (lastSpotClaimDate === todayStr) {
      return showToast("Already logged this spot today", "error");
    }

    // 2. Global Activity Streak Logic
    const lastGlobalVisit = visitData.last_visit ? new Date(visitData.last_visit).toDateString() : null;
    let newGlobalStreak = visitData.streak || 1;
    
    if (lastGlobalVisit) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (lastGlobalVisit === yesterday.toDateString()) {
        newGlobalStreak += 1;
      } else if (lastGlobalVisit !== todayStr) {
        newGlobalStreak = 1;
      }
    }

    // 3. Individual Spot Streak Logic
    let newSpotStreak = (spotInfo.streak || 0) + 1;
    if (lastSpotClaimDate) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (lastSpotClaimDate !== yesterday.toDateString() && lastSpotClaimDate !== todayStr) {
        newSpotStreak = 1; // Reset spot streak if a day was missed
      }
    }

    // 4. Update Objects
    const isFirstDiscovery = !unlockedSpots.includes(spotId);
    const newUnlocked = isFirstDiscovery ? [...unlockedSpots, spotId] : unlockedSpots;
    const newVisitData = { last_visit: today.toISOString(), streak: newGlobalStreak };
    const newSpotStreaks = { 
      ...spotStreaks, 
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

  // --- PROFILE ACTIONS ---
  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (cleaned.length < 3) return showToast("Name too short", "error");
    if (cleaned.includes('@') && cleaned.includes('.')) return showToast("Emails not allowed", "error");

    const { error } = await supabase.from('profiles')
      .update({ username: cleaned, last_username_change: new Date().toISOString() })
      .eq('id', user.id);
    
    if (error) {
      if (error.code === '23505') showToast("Username taken!", "error");
      else showToast("Failed to update identity", "error");
      return;
    }

    setUsername(cleaned); 
    setLastChange(new Date().toISOString()); 
    showToast("Identity updated!"); 
    fetchLeaderboard(spots); 
  };

  const toggleEmailVisibility = async () => {
    const newValue = !showEmail;
    const { error } = await supabase.from('profiles').update({ show_email: newValue }).eq('id', user.id);
    if (!error) setShowEmail(newValue);
  };

  // --- ADMIN ACTIONS ---
  const removeSpot = async (id) => {
    const newUnlocked = unlockedSpots.filter(x => x !== id);
    const newSpotStreaks = { ...spotStreaks };
    delete newSpotStreaks[id];

    await supabase.from('profiles').update({ 
      unlocked_spots: newUnlocked,
      spot_streaks: newSpotStreaks
    }).eq('id', user.id);

    setUnlockedSpots(newUnlocked); 
    setSpotStreaks(newSpotStreaks);
    fetchLeaderboard(spots);
  };

  const updateRadius = async (v) => { 
    await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id); 
    setCustomRadius(v); 
  };

  const resetTimer = async () => { 
    const { error } = await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);  
    if (!error) { setLastChange(null); showToast("Cooldown Reset!", "success"); }
  };

  const addNewSpot = async (s) => { 
    const id = s.name.toLowerCase().replace(/\s+/g, '-'); 
    const { error } = await supabase.from('spots').insert([{ id, ...s }]); 
    if (!error) {
      setSpots(prev => ({ ...prev, [id]: { id, ...s } })); 
      showToast(`${s.name} added!`);
    }
  };

  const deleteSpotFromDB = async (id) => { 
    await supabase.from('spots').delete().eq('id', id); 
    const n = {...spots}; delete n[id]; setSpots(n); 
  };

  return { 
    spots, unlockedSpots, visitData, spotStreaks,
    username, tempUsername, setTempUsername, 
    showEmail, lastChange, customRadius, leaderboard, 
    claimSpot, saveUsername, toggleEmailVisibility, 
    removeSpot, updateRadius, resetTimer, addNewSpot, deleteSpotFromDB,
    fetchLeaderboard 
  };
}
