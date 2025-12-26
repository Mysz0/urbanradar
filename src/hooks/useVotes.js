import { supabase } from '../supabase';

export function useVotes(user, setSpots) {
  
  const handleVote = async (spotId, direction) => {
    if (!user) return;

    try {
      // 1. Sprawdzamy czy głos już istnieje
      const { data: existingVote } = await supabase
        .from('spot_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('spot_id', spotId)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === direction) {
          // Usuwamy głos (ten sam przycisk kliknięty ponownie)
          await supabase.from('spot_votes').delete().eq('id', existingVote.id);
        } else {
          // Zmieniamy typ głosu (up -> down lub odwrotnie)
          await supabase
            .from('spot_votes')
            .update({ vote_type: direction })
            .eq('id', existingVote.id);
        }
      } else {
        // Nowy głos
        await supabase.from('spot_votes').insert({
          user_id: user.id,
          spot_id: spotId,
          vote_type: direction
        });
      }

      // 2. Po zmianie w DB pobieramy aktualne statystyki dla tego jednego spota
      const { data: upCount } = await supabase.from('spot_votes').select('*', { count: 'exact', head: true }).eq('spot_id', spotId).eq('vote_type', 'up');
      const { data: downCount } = await supabase.from('spot_votes').select('*', { count: 'exact', head: true }).eq('spot_id', spotId).eq('vote_type', 'down');

      // 3. Aktualizujemy lokalny stan spots
      setSpots(prev => ({
        ...prev,
        [spotId]: {
          ...prev[spotId],
          upvotes: upCount || 0,
          downvotes: downCount || 0
        }
      }));

    } catch (err) {
      console.error("Voting error:", err.message);
    }
  };

  return { handleVote };
}
