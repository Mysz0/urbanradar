import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';
import { useSpots } from './useSpots';
import { useAdmin } from './useAdmin';

export function useGameLogic(user, showToast) {
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      // 1. Fetch profiles with the NEW streak columns you added
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, total_points, streak_count')
        .order('total_points', { ascending: false })
        .limit(50);
      
      if (profileError) throw profileError;

      // 2. Fetch user_spots to calculate "Nodes Secured" (The 5 nodes fix)
      const { data: allClaims, error: claimsError } = await supabase
        .from('user_spots')
        .select('user_id');

      if (claimsError) throw claimsError;

      if (profiles) {
        const mappedLeaderboard = profiles.map(p => ({
          username: p.username || 'Anonymous',
          score: p.total_points || 0,
          // Count real rows in user_spots for each user
          found: allClaims ? allClaims.filter(c => c.user_id === p.id).length : 0,
          // Use the streak_count column directly from the profile
          streak: p.streak_count || 0 
        }));

        setLeaderboard(mappedLeaderboard);
      }
    } catch (err) { 
      console.error("Leaderboard fetch error:", err.message); 
    }
  };

  // Initialize hooks
  const profile = useProfile(user, showToast, fetchLeaderboard);
  const spots = useSpots(user, showToast, profile.totalPoints, profile.setTotalPoints, fetchLeaderboard);
  const admin = useAdmin(user, profile.userRole, showToast, spots.setSpots, spots.setSpotStreaks, profile.totalPoints, profile.setTotalPoints, spots.getMultiplier, fetchLeaderboard);

  useEffect(() => {
    if (user) fetchLeaderboard();
  }, [user]);

  return { ...profile, ...spots, ...admin, leaderboard, fetchLeaderboard };
}
