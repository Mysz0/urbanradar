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
        // 1. Fetch Profile (Base Data) - Cleaned of missing columns
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

        // 2. STREAK LOGIC: Calculate from user_spots activity
        const { data: claims } = await supabase
          .from('user_spots')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (claims && claims.length > 0) {
          // Get unique dates of activity (ignoring time)
          const uniqueDays = [...new Set(claims.map(c => 
            new Date(c.created_at).toDateString()
          ))];

          const today = new Date().toDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toDateString();

          let streak = 0;
          
          // Check if user was active today OR yesterday
          if (uniqueDays[0] === today || uniqueDays[0] === yesterdayStr) {
            streak = 1;
            // Loop backwards through unique days to count the chain
            for (let i = 0; i < uniqueDays.length - 1; i++) {
              const current = new Date(uniqueDays[i]);
              const prev = new Date(uniqueDays[i + 1]);
              
              // Calculate difference in days
              const diffTime = Math.abs(current - prev);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays === 1) {
                streak++;
              } else {
                break; // Chain broken
              }
            }
          }

          setVisitData({ 
            streak, 
            last_visit: claims[0].created_at 
          });
          
          // Show toast if they just claimed something today
          if (uniqueDays[0] === today && streak > 0) {
            // This prevents the toast from firing every refresh if you track locally
            // but for now it confirms the logic is working
          }
        }

      } catch (err) {
        console.error("Profile Fetch Error:", err);
      }
    };

    fetchProfile();
  }, [user]);

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
