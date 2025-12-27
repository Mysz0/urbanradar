import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useProfile(user, showToast, fetchLeaderboard) {
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [userRole, setUserRole] = useState('player');
  const [totalPoints, setTotalPoints] = useState(0);
  const [showEmail, setShowEmail] = useState(false);
  const [lastChange, setLastChange] = useState(null);
  const [customRadius, setCustomRadius] = useState(250);
  const [claimRadius, setClaimRadius] = useState(20);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });

  // 1. DATA FETCHING ONLY (Does not touch tempUsername)
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('username, role, total_points, show_email, last_username_change, custom_radius, claim_radius, streak_count, last_visit')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username || '');
        setUserRole(profile.role || 'player');
        setTotalPoints(profile.total_points || 0);
        setShowEmail(profile.show_email ?? false);
        setLastChange(profile.last_username_change);
        setCustomRadius(profile.custom_radius || 250);
        setClaimRadius(profile.claim_radius || 20);

        const now = new Date();
        const todayStr = now.toDateString();
        let dbStreak = profile.streak_count || 0;
        let lastVisitDate = profile.last_visit ? new Date(profile.last_visit) : null;
        let newStreak = dbStreak;

        if (!lastVisitDate) {
          newStreak = 1;
        } else if (lastVisitDate.toDateString() !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          newStreak = (lastVisitDate.toDateString() === yesterday.toDateString()) ? dbStreak + 1 : 1;
        }

        setVisitData({ last_visit: now.toISOString(), streak: newStreak });

        if (!lastVisitDate || lastVisitDate.toDateString() !== todayStr) {
          await supabase
            .from('profiles')
            .update({ 
              streak_count: newStreak, 
              last_visit: now.toISOString() 
            })
            .eq('id', user.id);

          showToast(`${newStreak} Day Streak Active!`);
          if (fetchLeaderboard) fetchLeaderboard();
        }
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    }
  }, [user]); // Minimal dependencies to prevent white screen/loops

  // 2. INITIAL LOAD (Sets the input box ONLY ONCE)
  useEffect(() => {
    if (user) {
      fetchProfile().then(() => {
        // After data is fetched, set the initial value of the input box
        supabase.from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.username) setTempUsername(data.username);
          });
      });
    }
  }, [user, fetchProfile]);

  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (cleaned.length < 3) return showToast("Identity too short", "error");
    
    if (cleaned === username) {
      return showToast("This is already your current identity!", "error");
    }

    const { data: reserved } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', cleaned)
      .not('id', 'eq', user.id)
      .maybeSingle();

    if (reserved) return showToast("Identity already reserved", "error");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ username: cleaned, last_username_change: now })
      .eq('id', user.id);

    if (!error) {
      setUsername(cleaned);
      setTempUsername(cleaned); // Keep sync after success
      setLastChange(now);
      showToast("Identity Synchronized");
      if (fetchLeaderboard) fetchLeaderboard();
    }
  };

  const updateRadius = async (v) => {
    const { error } = await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id);
    if (!error) {
      setCustomRadius(v);
      showToast(`Detect: ${v}m`);
    }
  };

  const updateClaimRadius = async (v) => {
    const { error } = await supabase.from('profiles').update({ claim_radius: v }).eq('id', user.id);
    if (!error) {
      setClaimRadius(v);
      showToast(`Claim: ${v}m`);
    }
  };

  const toggleEmailVisibility = async () => {
    const newVal = !showEmail;
    const { error } = await supabase.from('profiles').update({ show_email: newVal }).eq('id', user.id);
    if (!error) {
      setShowEmail(newVal);
      showToast(newVal ? "Email Visible" : "Email Hidden");
    }
  };

  const resetTimer = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);
    setLastChange(null);
    showToast("Cooldown Bypassed");
    fetchProfile();
  };

  return {
    username, tempUsername, setTempUsername,
    userRole, totalPoints, setTotalPoints,
    showEmail, lastChange, customRadius, claimRadius, visitData,
    saveUsername, updateRadius, updateClaimRadius, toggleEmailVisibility, resetTimer,
    fetchProfile
  };
}
