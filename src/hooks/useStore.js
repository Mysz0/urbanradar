import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: items } = await supabase.from('shop_items').select('*');
    const { data: inv } = await supabase.from('user_inventory').select('*, shop_items(*)').eq('user_id', user.id);
    
    setShopItems(items || []);
    setInventory(inv || []);
    setLoading(false);
  };

  const buyItem = async (item) => {
    if (totalPoints < item.price) return showToast("Not enough XP", "error");

    // 1. Deduct points from profile
    const newPoints = totalPoints - item.price;
    const { error: pError } = await supabase
      .from('profiles')
      .update({ total_points: newPoints })
      .eq('id', user.id);

    if (pError) return showToast("Purchase failed", "error");

    // 2. Add to inventory (Upsert if they already have one)
    const { error: iError } = await supabase
      .from('user_inventory')
      .upsert({ 
        user_id: user.id, 
        item_id: item.id,
        quantity: 1 // In a real app, you'd increment this
      }, { onConflict: 'user_id, item_id' });

    if (iError) {
      // Rollback points if inventory fails
      await supabase.from('profiles').update({ total_points: totalPoints }).eq('id', user.id);
      return showToast("Inventory error", "error");
    }

    setTotalPoints(newPoints);
    showToast(`Purchased ${item.name}!`, "success");
    fetchData(); // Refresh local list
  };

  useEffect(() => { fetchData(); }, [user]);

  return { shopItems, inventory, buyItem, loading };
}
