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

  // UPDATED: fetchProfile now takes a parameter to decide if it should overwrite the input box
  const fetchProfile = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('username, role, total_points, show_email, last_username_change, custom_radius, claim_radius, streak_count, last_visit')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.username || '');
        
        // Only reset the typing box on initial load or explicitly requested sync
        if (isInitial) {
          setTempUsername(profile.username || '');
        }

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
  }, [user, fetchLeaderboard, showToast]);

  // Initial load - we pass true to set the tempUsername for the first time
  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

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
      setLastChange(now);
      showToast("Identity Synchronized");
      // Re-sync profile but don't overwrite the box since user just typed it
      fetchProfile(false); 
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
    // Ensure all profile states are fresh
    fetchProfile(false);
  };

  return {
    username, tempUsername, setTempUsername,
    userRole, totalPoints, setTotalPoints,
    showEmail, lastChange, customRadius, claimRadius, visitData,
    saveUsername, updateRadius, updateClaimRadius, toggleEmailVisibility, resetTimer,
    fetchProfile
  };
}
