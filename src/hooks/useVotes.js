import { supabase } from '../supabase';

export function useVotes(user, setSpots) {
  
  const handleVote = async (spotId, voteType) => {
    if (!user) return;

    // Map incoming UI types to match DB constraints ('up' or 'down')
    const dbVoteType = voteType === 'upvotes' ? 'up' : 'down';

    try {
      // 1. Check if vote already exists
      const { data: existingVote, error: fetchError } = await supabase
        .from('spot_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('spot_id', spotId)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === dbVoteType) {
          // Remove vote if clicking the same button again
          await supabase.from('spot_votes').delete().eq('id', existingVote.id);
        } else {
          // Change vote type (e.g., from up to down)
          await supabase
            .from('spot_votes')
            .update({ vote_type: dbVoteType })
            .eq('id', existingVote.id);
        }
      } else {
        // Create new vote
        await supabase.from('spot_votes').insert({
          user_id: user.id,
          spot_id: spotId,
          vote_type: dbVoteType
        });
      }

      // 2. Fetch fresh counts from the database using correct strings 'up'/'down'
      const { count: upCount } = await supabase
        .from('spot_votes')
        .select('*', { count: 'exact', head: true })
        .eq('spot_id', spotId)
        .eq('vote_type', 'up');

      const { count: downCount } = await supabase
        .from('spot_votes')
        .select('*', { count: 'exact', head: true })
        .eq('spot_id', spotId)
        .eq('vote_type', 'down');

      // 3. Update the spots table directly
      await supabase
        .from('spots')
        .update({ 
          upvotes: upCount || 0, 
          downvotes: downCount || 0 
        })
        .eq('id', spotId);

      // 4. Update local state for immediate UI feedback
      setSpots(prev => {
        // If spots is an array (common in useSpots), we need to handle it differently 
        // than if it's an object keyed by spotId. Adjusting for standard array state:
        if (Array.isArray(prev)) {
          return prev.map(spot => 
            spot.id === spotId 
              ? { ...spot, upvotes: upCount || 0, downvotes: downCount || 0 }
              : spot
          );
        }
        
        // If it is an object keyed by ID:
        if (!prev[spotId]) return prev;
        return {
          ...prev,
          [spotId]: {
            ...prev[spotId],
            upvotes: upCount || 0,
            downvotes: downCount || 0
          }
        };
      });

    } catch (err) {
      console.error("Voting error:", err.message);
    }
  };

  return { handleVote };
}
