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
  const [unlockedThemes, setUnlockedThemes] = useState(['emerald', 'winter']);

  // 1. DATA FETCHING (Handles Streak Logic & State Sync)
  const fetchProfile = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, role, total_points, show_email, last_username_change, custom_radius, claim_radius, streak_count, last_visit, unlocked_themes')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setUsername(profile.username || '');
        // We only set tempUsername if it's currently empty (initial load)
        setTempUsername(prev => prev === '' ? (profile.username || '') : prev);
        
        setUserRole(profile.role || 'player');
        setTotalPoints(profile.total_points || 0);
        setShowEmail(profile.show_email ?? false);
        setLastChange(profile.last_username_change);
        setCustomRadius(profile.custom_radius || 250);
        setClaimRadius(profile.claim_radius || 20);
        
        console.log('fetchProfile: Setting unlocked themes to:', profile.unlocked_themes);
        setUnlockedThemes(profile.unlocked_themes || ['emerald', 'winter']);

        // Streak & Visit Logic
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

        // Update DB if it's a new day
        if (!lastVisitDate || lastVisitDate.toDateString() !== todayStr) {
          await supabase
            .from('profiles')
            .update({ 
              streak_count: newStreak, 
              last_visit: now.toISOString() 
            })
            .eq('id', userId);

          if (showToast && newStreak > 1) showToast(`${newStreak} Day Streak Active!`);
          if (fetchLeaderboard) fetchLeaderboard();
        }
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle streak toast separately to avoid dependency loop
  useEffect(() => {
    if (visitData.streak > 0 && showToast) {
      // Only show on actual new streak update, not every render
    }
  }, [visitData.streak]);

  const saveUsername = async () => {
    if (!user?.id) return;
    const cleaned = tempUsername.trim();
    
    // Cooldown check (7 days)
    if (lastChange) {
      const lastTs = new Date(lastChange).getTime();
      const nowTs = new Date().getTime();
      const diffDays = (nowTs - lastTs) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return showToast(`Cooldown active: ${Math.ceil(7 - diffDays)} days left`, "error");
      }
    }

    if (cleaned.length < 3) return showToast("Identity too short", "error");
    if (cleaned === username) return showToast("Already your identity!", "error");

    const { data: reserved } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', cleaned)
      .not('id', 'eq', user.id)
      .maybeSingle();

    if (reserved) return showToast("Identity already reserved", "error");

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ username: cleaned, last_username_change: nowIso })
      .eq('id', user.id);

    if (!error) {
      setUsername(cleaned);
      setTempUsername(cleaned);
      setLastChange(nowIso);
      showToast("Identity Synchronized");
      if (fetchLeaderboard) fetchLeaderboard();
    } else {
      showToast("Update failed", "error");
    }
  };

  const updateRadius = async (v) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id);
    if (!error) {
      setCustomRadius(v);
      showToast(`Detect: ${v}m`);
    }
  };

  const updateClaimRadius = async (v) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ claim_radius: v }).eq('id', user.id);
    if (!error) {
      setClaimRadius(v);
      showToast(`Claim: ${v}m`);
    }
  };

  const toggleEmailVisibility = async () => {
    if (!user?.id) return;
    const newVal = !showEmail;
    const { error } = await supabase.from('profiles').update({ show_email: newVal }).eq('id', user.id);
    if (!error) {
      setShowEmail(newVal);
      showToast(newVal ? "Email Visible" : "Email Hidden");
    }
  };

  const resetTimer = async () => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);
    if (!error) {
      setLastChange(null);
      showToast("Cooldown Bypassed");
      fetchProfile();
    }
  };

  return {
    username, tempUsername, setTempUsername,
    userRole, totalPoints, setTotalPoints,
    showEmail, lastChange, customRadius, claimRadius, visitData,
    saveUsername, updateRadius, updateClaimRadius, toggleEmailVisibility, resetTimer,
    fetchProfile,
    unlockedThemes
  };
}
