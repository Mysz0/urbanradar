import { supabase } from '../supabase';

export function useVotes(user, setSpots, unlockedSpots = []) {
  
  const handleVote = async (spotId, voteType) => {
    if (!user) return;
    const strId = String(spotId);

    // 1. Security Check: Only allow voting if the spot is unlocked
    if (!unlockedSpots.includes(strId)) {
      console.warn("Cannot vote: Node is still locked.");
      return;
    }

    const dbVoteType = voteType === 'upvotes' ? 'up' : 'down';

    try {
      // 2. Check if the vote exists in the spot_votes table
      const { data: existingVote } = await supabase
        .from('spot_votes')
        .select('id, vote_type')
        .eq('user_id', user.id)
        .eq('spot_id', strId)
        .maybeSingle();

      let finalMyVote = dbVoteType;

      // 3. Database toggle logic
      if (existingVote) {
        if (existingVote.vote_type === dbVoteType) {
          await supabase.from('spot_votes').delete().eq('id', existingVote.id);
          finalMyVote = null;
        } else {
          await supabase.from('spot_votes').update({ vote_type: dbVoteType }).eq('id', existingVote.id);
        }
      } else {
        await supabase.from('spot_votes').insert({
          user_id: user.id,
          spot_id: strId,
          vote_type: dbVoteType
        });
      }

      // 4. Fetch ALL votes for this spot to calculate fresh totals
      // This is more reliable than separate count calls
      const { data: allVotes, error: countError } = await supabase
        .from('spot_votes')
        .select('vote_type')
        .eq('spot_id', strId);

      if (countError) throw countError;

      const freshUp = allVotes?.filter(v => v.vote_type === 'up').length || 0;
      const freshDown = allVotes?.filter(v => v.vote_type === 'down').length || 0;

      // 5. Update the main 'spots' table (The Leaderboard Source)
      // Since you ran the SQL RLS policy, this should now succeed
      const { error: patchError } = await supabase
        .from('spots')
        .update({ 
          upvotes: freshUp, 
          downvotes: freshDown 
        })
        .eq('id', strId);

      if (patchError) {
        console.error("Leaderboard Sync Failed:", patchError.message);
      }

      // 6. Update local state for immediate feedback
      setSpots(prev => {
        const updateData = { 
          upvotes: freshUp, 
          downvotes: freshDown, 
          myVote: finalMyVote 
        };

        if (Array.isArray(prev)) {
          return prev.map(s => String(s.id) === strId ? { ...s, ...updateData } : s);
        }
        
        if (!prev[strId]) return prev;
        return {
          ...prev,
          [strId]: { ...prev[strId], ...updateData }
        };
      });

    } catch (err) {
      console.error("Voting system error:", err.message);
    }
  };

  return { handleVote };
}
