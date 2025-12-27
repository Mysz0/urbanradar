import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to calculate human-readable time left
  const getTimeLeft = (activatedAt, durationHours) => {
    if (!activatedAt || !durationHours) return null;
    
    const expiryTime = new Date(activatedAt).getTime() + (durationHours * 60 * 60 * 1000);
    const now = new Date().getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return "EXPIRED";

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return `${h}h ${m}m ${s}s`;
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
      
      const processedInv = (inv || []).map(item => ({
        ...item,
        timeLeft: item.is_active ? getTimeLeft(item.activated_at, item.shop_items.duration_hours) : null
      }));

      setShopItems(items || []);
      setInventory(processedInv);
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Live timer to update the countdown in UI every second
  useEffect(() => {
    const timer = setInterval(() => {
      setInventory(prevInv => prevInv.map(item => {
        if (item.is_active && item.shop_items.category === 'boost') {
          const newTime = getTimeLeft(item.activated_at, item.shop_items.duration_hours);
          // If a boost just expired during the session, you might want to refresh data
          if (newTime === "EXPIRED" && item.timeLeft !== "EXPIRED") {
             fetchData();
          }
          return { ...item, timeLeft: newTime };
        }
        return item;
      }));
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
