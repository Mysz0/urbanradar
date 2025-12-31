import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useSpots(user, showToast, totalPoints, setTotalPoints, fetchLeaderboard, bonuses) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [spotStreaks, setSpotStreaks] = useState({});
  
  // Use the bonuses passed from useStore, or fall back to defaults
  const activeXPBoost = bonuses?.xpMultiplier || 1;
  const activeRadiusBoost = bonuses?.radiusBonus || 0;

  const getMultiplier = (days) => {
    if (days >= 10) return 1.5;
    if (days >= 7) return 1.3;
    if (days >= 3) return 1.1;
    return 1.0;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const δφ = ((lat2 - lat1) * Math.PI) / 180;
    const δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(δφ / 2) * Math.sin(δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(δλ / 2) * Math.sin(δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchSpotData = useCallback(async () => {
    if (!user) return;
    try {
      const [spotsRes, allVotesRes, myVotesRes] = await Promise.all([
        supabase.from('spots').select('*'),
        supabase.from('spot_votes').select('spot_id, vote_type'),
        supabase.from('spot_votes').select('spot_id, vote_type').eq('user_id', user.id)
      ]);

      const globalCounts = (allVotesRes.data || []).reduce((acc, v) => {
        if (!acc[v.spot_id]) acc[v.spot_id] = { up: 0, down: 0 };
        acc[v.spot_id][v.vote_type]++;
        return acc;
      }, {});

      const voteLookup = (myVotesRes.data || []).reduce((acc, v) => ({ 
        ...acc, [v.spot_id]: v.vote_type 
      }), {});

      const merged = (spotsRes.data || []).reduce((acc, s) => {
        const c = globalCounts[s.id] || { up: 0, down: 0 };
        acc[s.id] = { ...s, upvotes: c.up, downvotes: c.down, myVote: voteLookup[s.id] || null };
        return acc;
      }, {});

      setSpots(merged);

      const { data: userClaimData } = await supabase.from('user_spots').select('*').eq('user_id', user.id);
      if (userClaimData) {
        const streakMap = {};
        const unlockedList = [];
        userClaimData.forEach((row) => {
          unlockedList.push(String(row.spot_id));
          streakMap[row.spot_id] = { streak: row.streak, last_claim: row.last_claim };
        });
        setUnlockedSpots(unlockedList);
        setSpotStreaks(streakMap);
      }
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchSpotData();

    // Listen for spot changes globally
    const spotChannel = supabase.channel('spots_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, (payload) => {
       fetchSpotData();
    }).subscribe();

    return () => {
      supabase.removeChannel(spotChannel);
    };
  }, [user, fetchSpotData]);

  const claimSpot = async (input, baseRadius) => {
    if (!user) return;
    const todayStr = new Date().toDateString();
    
    // Dynamically update range based on radius boost
    const detectionRange = (baseRadius || 250) + activeRadiusBoost;
    let targets = [];

    if (input?.lat && input?.lng) {
      targets = Object.values(spots).filter(s => getDistance(input.lat, input.lng, s.lat, s.lng) <= detectionRange);
    } else if (typeof input === 'string' && spots[input]) {
      targets = [spots[input]];
    }

    if (targets.length === 0) return showToast("No nodes in range", "error");

    let totalEarned = 0;
    const upsertRows = [];
    const newStreaks = { ...spotStreaks };

    targets.forEach(spot => {
      const info = spotStreaks[spot.id] || { last_claim: null, streak: 0 };
      if (info.last_claim && new Date(info.last_claim).toDateString() === todayStr) return;

      const nextStreak = (Number(info.streak) || 0) + 1;
      
      // APPLY XP BOOST MULTIPLIER
      const earned = Math.floor((spot.points || 100) * getMultiplier(nextStreak) * activeXPBoost);
      
      totalEarned += earned;
      const ts = new Date().toISOString();
      newStreaks[spot.id] = { last_claim: ts, streak: nextStreak };
      upsertRows.push({ user_id: user.id, spot_id: spot.id, streak: nextStreak, last_claim: ts });
    });

    if (upsertRows.length === 0) return showToast("Nodes secured today", "error");

    // Use secure function instead of direct DB update
    const spotsData = targets.map(spot => {
      const info = newStreaks[spot.id];
      const nextStreak = info.streak;
      const earned = Math.floor((spot.points || 100) * getMultiplier(nextStreak) * activeXPBoost);
      return {
        spot_id: spot.id,
        points: earned,
        is_new: !spotStreaks[spot.id]
      };
    });

    const { data, error } = await supabase.rpc('claim_spots', {
      p_user_id: user.id,
      p_spots: spotsData
    });

    if (error) {
      console.error('Claim error:', error);
      return showToast("Claim failed", "error");
    }

    if (data.error) {
      return showToast(data.error, "error");
    }

    setUnlockedSpots(prev => [...new Set([...prev, ...upsertRows.map(r => String(r.spot_id))])]);
    setSpotStreaks(newStreaks);
    setTotalPoints(data.newTotal);
    showToast(`Secured ${targets.length} nodes: +${data.pointsEarned} XP!`, "success");
    if (fetchLeaderboard) fetchLeaderboard();
  };

  const removeSpot = async (id) => {
    try {
      const { error } = await supabase.from('user_spots').delete().eq('user_id', user.id).eq('spot_id', id);
      if (error) throw error;
      setUnlockedSpots(prev => prev.filter(s => s !== String(id)));
      setSpotStreaks(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      showToast("Spot history cleared");
    } catch (err) { 
      console.error(err);
      showToast("Removal failed", "error"); 
    }
  };

  return { spots, setSpots, unlockedSpots, spotStreaks, setSpotStreaks, claimSpot, removeSpot, getMultiplier, activeXPBoost, activeRadiusBoost };
}
