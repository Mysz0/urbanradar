import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';
import { useSpots } from './useSpots';
import { useAdmin } from './useAdmin';

export function useGameLogic(user, showToast) {
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, total_points, streak_count')
        .order('total_points', { ascending: false })
        .limit(50);
      
      if (profileError) throw profileError;

      const { data: allClaims, error: claimsError } = await supabase
        .from('user_spots')
        .select('user_id');

      if (claimsError) throw claimsError;

      if (profiles) {
        const mappedLeaderboard = profiles.map(p => ({
          username: p.username || 'Anonymous',
          score: p.total_points || 0,
          found: allClaims ? allClaims.filter(c => c.user_id === p.id).length : 0,
          streak: p.streak_count || 0 
        }));

        setLeaderboard(mappedLeaderboard);
      }
    } catch (err) { 
      console.error("Leaderboard fetch error:", err.message); 
    }
  };

  // 1. Initialize Profile (Now includes claimRadius and updateClaimRadius)
  const profile = useProfile(user, showToast, fetchLeaderboard);

  // 2. Initialize Spots
  const spots = useSpots(user, showToast, profile.totalPoints, profile.setTotalPoints, fetchLeaderboard);

  // 3. Initialize Admin (Now has access to both detection and claim options)
  const admin = useAdmin(
    user, 
    profile.userRole, 
    showToast, 
    spots.setSpots, 
    spots.setSpotStreaks, 
    profile.totalPoints, 
    profile.setTotalPoints, 
    spots.getMultiplier, 
    fetchLeaderboard
  );

  useEffect(() => {
    if (user) fetchLeaderboard();
  }, [user]);

  // We return EVERYTHING so App.jsx can destructure it
  return { 
    ...profile, 
    ...spots, 
    ...admin, 
    leaderboard, 
    fetchLeaderboard 
  };
}
