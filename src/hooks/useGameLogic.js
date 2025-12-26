import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';
import { useSpots } from './useSpots';
import { useAdmin } from './useAdmin';
import { useVotes } from './useVotes';
import { useStore } from './useStore';

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

  const profile = useProfile(user, showToast, fetchLeaderboard);
  
  // Initialize Spots
  const spots = useSpots(
    user, 
    showToast, 
    profile.totalPoints, 
    profile.setTotalPoints, 
    fetchLeaderboard
  );
  
  // Initialize Store (Includes buyItem and activateItem)
  const store = useStore(
    user, 
    profile.totalPoints, 
    profile.setTotalPoints, 
    showToast
  );

  // Initialize Voting
  const { handleVote } = useVotes(user, spots.setSpots);

  // Initialize Admin
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

  return { 
    ...profile, 
    ...spots, 
    ...admin,
    ...store, // Spreads shopItems, inventory, buyItem, activateItem
    handleVote, 
    leaderboard, 
    fetchLeaderboard 
  };
}
