import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to calculate time, progress, and handle auto-deletion
  const getItemStatus = (item) => {
    if (!item.is_active || !item.activated_at || !item.shop_items?.duration_hours) {
      return { timeLeft: null, progress: 100 };
    }
    
    const durationMs = item.shop_items.duration_hours * 60 * 60 * 1000;
    const startTime = new Date(item.activated_at).getTime();
    const expiryTime = startTime + durationMs;
    const now = new Date().getTime();
    const diff = expiryTime - now;

    if (diff <= 0) {
      // Logic for deleting expired boosts
      if (item.shop_items.category === 'boost') {
        deleteExpiredItem(item.id);
      }
      return { timeLeft: "EXPIRED", progress: 0 };
    }

    // Calculate percentage for progress bar
    const progress = Math.max(0, Math.min(100, (diff / durationMs) * 100));

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { 
      timeLeft: `${h}h ${m}m ${s}s`, 
      progress: progress 
    };
  };

  const deleteExpiredItem = async (inventoryId) => {
    try {
      await supabase.from('user_inventory').delete().eq('id', inventoryId);
      // Immediately filter out from local state so it vanishes
      setInventory(prev => prev.filter(i => i.id !== inventoryId));
    } catch (err) {
      console.error("Auto-delete failed:", err);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: items } = await supabase.from('shop_items').select('*');
      const { data: inv } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id);
      
      const processedInv = (inv || []).map(item => {
        const { timeLeft, progress } = getItemStatus(item);
        return { ...item, timeLeft, progress };
      });

      setShopItems(items || []);
      setInventory(processedInv);
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Live timer to update the countdown and progress bar every second
  useEffect(() => {
    const timer = setInterval(() => {
      setInventory(prevInv => {
        const updated = prevInv.map(item => {
          if (item.is_active && item.shop_items?.category === 'boost') {
            const { timeLeft, progress } = getItemStatus(item);
            return { ...item, timeLeft, progress };
          }
          return item;
        });

        // Filter out items that are marked EXPIRED so they disappear from UI
        return updated.filter(item => item.timeLeft !== "EXPIRED");
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inventory.length]); 

  const buyItem = async (item) => {
    if (totalPoints < item.price) return showToast("Not enough XP", "error");
    setLoading(true);
    try {
      const { error } = await supabase.rpc('buy_item', { target_item_id: item.id });
      if (error) throw error;
      setTotalPoints(prev => prev - item.price);
      showToast(`Purchased ${item.name}!`, "success");
      await fetchData();
    } catch (err) {
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
        // Deactivate other boosts first
        await supabase
          .from('user_inventory')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('shop_items.category', 'boost');
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
      showToast("Activation failed", "error");
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  return { shopItems, inventory, buyItem, activateItem, loading };
}
