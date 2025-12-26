import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';
import { useSpots } from './useSpots';
import { useAdmin } from './useAdmin';

export function useGameLogic(user, showToast) {
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      // CORRECTED: Removed deleted columns 'unlocked_spots' and 'visit_data'
      // These now live in separate tables, so we fetch the base profile stats here.
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('username, total_points')
        .order('total_points', { ascending: false })
        .limit(50);
      
      if (error) throw error;

      if (profiles) {
        setLeaderboard(profiles.map(p => ({ 
          username: p.username || 'Anonymous', 
          score: p.total_points || 0, 
          // Note: Since these are in other tables now, we default to 0 
          // to prevent UI crashes. You can add joins later if needed.
          found: 0, 
          streak: 0 
        })));
      }
    } catch (err) { 
      console.error("Leaderboard fetch error:", err.message); 
    }
  };

  // 1. Initialize Profile Logic
  // This hook handles 'visitData' and 'username'
  const profile = useProfile(user, showToast, fetchLeaderboard);

  // 2. Initialize Spot Logic 
  // This hook handles 'spots', 'unlockedSpots', and 'claimSpot'
  const spots = useSpots(
    user, 
    showToast, 
    profile.totalPoints, 
    profile.setTotalPoints, 
    fetchLeaderboard
  );

  // 3. Initialize Admin Logic
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
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  return {
    ...profile, // Returns visitData (for the streak icon), username, etc.
    ...spots,   // Returns spots, unlockedSpots, claimSpot
    ...admin,   // Returns admin functions
    leaderboard,
    fetchLeaderboard
  };
}
