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
    // Client-side check for UX
    if (totalPoints < item.price) return showToast("Not enough XP", "error");

    setLoading(true);
    
    try {
      // Securely calling the SQL function (Atomic Transaction)
      const { error } = await supabase.rpc('buy_item', { 
        target_item_id: item.id 
      });

      if (error) throw error;

      // Update local state points
      setTotalPoints(prev => prev - item.price);
      showToast(`Purchased ${item.name}!`, "success");
      
      // Refresh local inventory list
      await fetchData();
    } catch (err) {
      console.error("Purchase error:", err.message);
      showToast(err.message || "Purchase failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const activateItem = async (inventoryId) => {
    if (!user) return;

    const itemToActivate = inventory.find(inv => inv.id === inventoryId);
    if (!itemToActivate) return;

    try {
      if (itemToActivate.shop_items.category === 'boost') {
        await supabase
          .from('user_inventory')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      const { error } = await supabase
        .from('user_inventory')
        .update({ 
          is_active: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', inventoryId);

      if (error) throw error;

      showToast(`${itemToActivate.shop_items.name} Activated!`, "success");
      fetchData(); 
      
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
