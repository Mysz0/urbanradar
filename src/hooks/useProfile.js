import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useProfile(user, showToast, fetchLeaderboard) {
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [userRole, setUserRole] = useState('player');
  const [totalPoints, setTotalPoints] = useState(0);
  const [showEmail, setShowEmail] = useState(false);
  const [lastChange, setLastChange] = useState(null);
  const [customRadius, setCustomRadius] = useState(250);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        // 1. Fetch Profile (Base Data)
        let { data: profile } = await supabase
          .from('profiles')
          .select('username, role, total_points, show_email, last_username_change, custom_radius')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUsername(profile.username || '');
          setTempUsername(profile.username || '');
          setUserRole(profile.role || 'player');
          setTotalPoints(profile.total_points || 0);
          setShowEmail(profile.show_email ?? false);
          setLastChange(profile.last_username_change);
          setCustomRadius(profile.custom_radius || 250);
        }

        // 2. Fetch Streak from NEW TABLE (user_streaks)
        // Adjust 'user_streaks' to your actual table name if different
        let { data: streakRow } = await supabase
          .from('user_streaks')
          .select('streak_count, last_visit')
          .eq('user_id', user.id)
          .maybeSingle();

        // --- DAILY VISIT STREAK LOGIC ---
        const now = new Date();
        const todayStr = now.toDateString();
        
        // Use the new table data or default to empty
        let currentStreak = streakRow?.streak_count || 0;
        const lastVisitDate = streakRow?.last_visit ? new Date(streakRow.last_visit) : null;
        let newStreak = currentStreak;

        if (!lastVisitDate) {
          newStreak = 1;
        } else if (lastVisitDate.toDateString() !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Increment if yesterday, otherwise reset to 1
          newStreak = (lastVisitDate.toDateString() === yesterday.toDateString()) ? currentStreak + 1 : 1;
        }

        // 3. Update the NEW table if the visit is new today
        if (!lastVisitDate || lastVisitDate.toDateString() !== todayStr) {
          const updatedVisit = { 
            user_id: user.id, // Primary key link
            last_visit: now.toISOString(), 
            streak_count: newStreak 
          };
          
          setVisitData({ last_visit: updatedVisit.last_visit, streak: newStreak });
          
          await supabase
            .from('user_streaks')
            .upsert(updatedVisit, { onConflict: 'user_id' });

          showToast(`${newStreak} Day Streak Active!`);
        } else {
          setVisitData({ last_visit: lastVisitDate.toISOString(), streak: currentStreak });
        }

      } catch (err) {
        console.error("Profile Fetch Error:", err);
      }
    };

    fetchProfile();
  }, [user]);

  // ... (saveUsername, updateRadius, toggleEmailVisibility, resetTimer remain the same)
  // Ensure saveUsername and toggleEmailVisibility ONLY update columns that exist in 'profiles'

  const saveUsername = async () => {
    const cleaned = tempUsername.trim();
    if (cleaned.length < 3) return showToast("Identity too short", "error");
    if (cleaned === username) return;

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
      if (fetchLeaderboard) fetchLeaderboard();
    }
  };

  const updateRadius = async (v) => {
    const { error } = await supabase
      .from('profiles')
      .update({ custom_radius: v })
      .eq('id', user.id);
    if (!error) {
      setCustomRadius(v);
      showToast(`Radius: ${v}m`);
    }
  };

  const toggleEmailVisibility = async () => {
    const newVal = !showEmail;
    const { error } = await supabase
      .from('profiles')
      .update({ show_email: newVal })
      .eq('id', user.id);
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
  };

  return {
    username, tempUsername, setTempUsername,
    userRole, totalPoints, setTotalPoints,
    showEmail, lastChange, customRadius, visitData,
    saveUsername, updateRadius, toggleEmailVisibility, resetTimer
  };
}
