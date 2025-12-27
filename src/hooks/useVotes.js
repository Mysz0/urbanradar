import { supabase } from '../supabase';

export function useVotes(user, setSpots) {
  
  const handleVote = async (spotId, voteType) => {
    if (!user) return;

    // Ensure voteType matches what you send from the UI ('upvotes' or 'downvotes')
    try {
      // 1. Check if vote already exists
      const { data: existingVote, error: fetchError } = await supabase
        .from('spot_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('spot_id', spotId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors if not found

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same button again
          await supabase.from('spot_votes').delete().eq('id', existingVote.id);
        } else {
          // Change vote type (e.g., from up to down)
          await supabase
            .from('spot_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
        }
      } else {
        // Create new vote
        await supabase.from('spot_votes').insert({
          user_id: user.id,
          spot_id: spotId,
          vote_type: voteType
        });
      }

      // 2. Fetch fresh counts from the database
      const { count: upCount } = await supabase
        .from('spot_votes')
        .select('*', { count: 'exact', head: true })
        .eq('spot_id', spotId)
        .eq('vote_type', 'upvotes');

      const { count: downCount } = await supabase
        .from('spot_votes')
        .select('*', { count: 'exact', head: true })
        .eq('spot_id', spotId)
        .eq('vote_type', 'downvotes');

      // 3. Update the spots table directly (Optional but recommended so counts are persistent)
      await supabase
        .from('spots')
        .update({ 
          upvotes: upCount || 0, 
          downvotes: downCount || 0 
        })
        .eq('id', spotId);

      // 4. Update local state for immediate UI feedback
      setSpots(prev => {
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
