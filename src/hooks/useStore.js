import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: items } = await supabase.from('shop_items').select('*');
      const { data: inv } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id);
      
      setShopItems(items || []);
      setInventory(inv || []);
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buyItem = async (item) => {
    if (totalPoints < item.price) return showToast("Not enough XP", "error");

    const newPoints = totalPoints - item.price;
    const { error: pError } = await supabase
      .from('profiles')
      .update({ total_points: newPoints })
      .eq('id', user.id);

    if (pError) return showToast("Purchase failed", "error");

    const { error: iError } = await supabase
      .from('user_inventory')
      .upsert({ 
        user_id: user.id, 
        item_id: item.id,
        quantity: 1 
      }, { onConflict: 'user_id, item_id' });

    if (iError) {
      await supabase.from('profiles').update({ total_points: totalPoints }).eq('id', user.id);
      return showToast("Inventory error", "error");
    }

    setTotalPoints(newPoints);
    showToast(`Purchased ${item.name}!`, "success");
    fetchData();
  };

  const activateItem = async (inventoryId) => {
    if (!user) return;

    // 1. Find the item in local state
    const itemToActivate = inventory.find(inv => inv.id === inventoryId);
    if (!itemToActivate) return;

    try {
      // 2. If it's a boost, deactivate other active boosts first
      if (itemToActivate.shop_items.category === 'boost') {
        await supabase
          .from('user_inventory')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      // 3. Activate the chosen item
      const { error } = await supabase
        .from('user_inventory')
        .update({ 
          is_active: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', inventoryId);

      if (error) throw error;

      showToast(`${itemToActivate.shop_items.name} Activated!`, "success");
      fetchData(); // Refresh to update UI and active status
      
      // Force a reload if it's a permanent upgrade or global boost
      if (itemToActivate.shop_items.category === 'upgrade') {
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Activation error:", err);
      showToast("Activation failed", "error");
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  return { shopItems, inventory, buyItem, activateItem, loading };
}
