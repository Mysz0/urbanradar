import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useSpots(user, showToast, totalPoints, setTotalPoints, fetchLeaderboard) {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [spotStreaks, setSpotStreaks] = useState({});
  
  const [activeXPBoost, setActiveXPBoost] = useState(1);
  const [activeRadiusBoost, setActiveRadiusBoost] = useState(0); 

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

  const fetchActiveBonuses = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      let xpMult = 1;
      let radBonus = 0;

      data?.forEach(item => {
        if (!item.shop_items) return;
        if (item.shop_items.icon_name === 'Zap') xpMult = Math.max(xpMult, item.shop_items.effect_value);
        if (item.shop_items.icon_name === 'Maximize') radBonus += item.shop_items.effect_value;
      });

      setActiveXPBoost(xpMult);
      setActiveRadiusBoost(radBonus);
    } catch (err) {
      console.error("Bonus fetch error:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const fetchSpotData = async () => {
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
          acc[s.id] = { ...s, upvotes: c.up, downvotes: c.down, myvote: voteLookup[s.id] || null };
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
        await fetchActiveBonuses();
      } catch (err) { console.error(err); }
    };

    fetchSpotData();

    const invChannel = supabase.channel('inv_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'user_inventory', filter: `user_id=eq.${user.id}` }, () => fetchActiveBonuses()).subscribe();
    const spotChannel = supabase.channel('spots_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'spots' }, (payload) => {
      if (payload.eventType === 'INSERT') fetchSpotData();
      if (payload.eventType === 'UPDATE') fetchSpotData();
      if (payload.eventType === 'DELETE') fetchSpotData();
    }).subscribe();

    return () => {
      supabase.removeChannel(invChannel);
      supabase.removeChannel(spotChannel);
    };
  }, [user, fetchActiveBonuses]);

  const claimSpot = async (input, baseRadius) => {
    if (!user) return;
    const todayStr = new Date().toDateString();
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
      const earned = Math.floor((spot.points || 100) * getMultiplier(nextStreak) * activeXPBoost);
      
      totalEarned += earned;
      const ts = new Date().toISOString();
      newStreaks[spot.id] = { last_claim: ts, streak: nextStreak };
      upsertRows.push({ user_id: user.id, spot_id: spot.id, streak: nextStreak, last_claim: ts });
    });

    if (upsertRows.length === 0) return showToast("Nodes secured today", "error");

    const { error: uErr } = await supabase.from('user_spots').upsert(upsertRows, { onConflict: 'user_id, spot_id' });
    if (uErr) return showToast("Sync error", "error");

    const newTotal = (totalPoints || 0) + totalEarned;
    await supabase.from('profiles').update({ total_points: newTotal }).eq('id', user.id);

    setUnlockedSpots(prev => [...new Set([...prev, ...upsertRows.map(r => String(r.spot_id))])]);
    setSpotStreaks(newStreaks);
    setTotalPoints(newTotal);
    showToast(`Secured ${upsertRows.length} nodes: +${totalEarned} XP!`, "success");
    if (fetchLeaderboard) fetchLeaderboard();
  };

  const removeSpot = async (id) => {
    try {
      await supabase.from('user_spots').delete().eq('user_id', user.id).eq('spot_id', id);
      setUnlockedSpots(prev => prev.filter(s => s !== String(id)));
      showToast("Spot history cleared");
    } catch (err) { showToast("Removal failed", "error"); }
  };

  return { spots, setSpots, unlockedSpots, spotStreaks, setSpotStreaks, claimSpot, removeSpot, getMultiplier, activeXPBoost, activeRadiusBoost };
}
