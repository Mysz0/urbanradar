import { useState, useEffect, useRef } from 'react'; // Fixed casing
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) { // Fixed: useStore
  const [shopItems, setShopItems] = useState([]); // Fixed: useState
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const isActivating = useRef(false); // Fixed: useRef

  const getItemStatus = (item) => {
    if (!item.is_active || !item.activated_at || !item.shop_items?.duration_hours) {
      return { timeLeft: null, progress: 100 };
    }
    
    const durationMs = item.shop_items.duration_hours * 60 * 60 * 1000;
    const startTime = new Date(item.activated_at).getTime(); // Fixed: New Date().getTime()
    const expiryTime = startTime + durationMs;
    const now = new Date().getTime();
    const diff = expiryTime - now;

    if (diff <= 0) {
      deactivateExpiredItem(item.id);
      return { timeLeft: "EXPIRED", progress: 0 };
    }

    const progress = Math.max(0, Math.min(100, (diff / durationMs) * 100)); // Fixed: Math
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { timeLeft: `${h}h ${m}m ${s}s`, progress };
  };

  const deactivateExpiredItem = async (inventoryId) => {
    try {
      await supabase
        .from('user_inventory')
        .update({ is_active: false, activated_at: null })
        .eq('id', inventoryId);
      
      setInventory(prev => prev.map(i => 
        i.id === inventoryId 
          ? { ...i, is_active: false, activated_at: null, timeLeft: null, progress: 100 }
          : i
      ));
    } catch (err) {
      console.error("Auto-deactivate failed:", err);
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
      
      const processedInv = (inv || []).map(item => ({
        ...item,
        ...getItemStatus(item)
      }));

      setShopItems(items || []);
      setInventory(processedInv);
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { // Fixed: useEffect
    const timer = setInterval(() => { // Fixed: setInterval
      setInventory(prevInv => 
        prevInv.map(item => {
          if (item.is_active) {
            return { ...item, ...getItemStatus(item) };
          }
          return item;
        })
      );
    }, 1000);
    return () => clearInterval(timer); // Fixed: clearInterval
  }, []);

  const buyItem = async (item) => {
    if (totalPoints < item.price || loading) return;
    setLoading(true);
    try {
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ total_points: totalPoints - item.price })
        .eq('id', user.id);

      if (pointsError) throw pointsError;

      const existing = inventory.find(i => i.item_id === item.id);
      
      if (existing) {
        await supabase
          .from('user_inventory')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_inventory').insert({
          user_id: user.id,
          item_id: item.id,
          quantity: 1,
          is_active: false
        });
      }
      
      setTotalPoints(prev => prev - item.price);
      showToast(`Purchased ${item.name}!`, "success");
      await fetchData();
    } catch (err) {
      console.error("Purchase error:", err);
      showToast("Purchase failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const activateItem = async (inventoryId) => {
    if (!user || loading || isActivating.current) return;
    
    const item = inventory.find(inv => inv.id === inventoryId);
    if (!item || item.quantity < 1) return;

    isActivating.current = true;
    setLoading(true);

    try {
      const boostDurationMs = item.shop_items.duration_hours * 60 * 60 * 1000;

      if (item.is_active) {
        const currentActivation = new Date(item.activated_at).getTime();
        const currentExpiry = currentActivation + boostDurationMs;
        const now = new Date().getTime();
        const remainingTime = Math.max(0, currentExpiry - now);
        
        const newActivationTime = new Date(now + remainingTime);

        const { error } = await supabase
          .from('user_inventory')
          .update({ 
            quantity: item.quantity - 1,
            activated_at: newActivationTime.toISOString()
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} extended!`, "success");
      } else {
        const { error } = await supabase
          .from('user_inventory')
          .update({
            quantity: item.quantity - 1,
            is_active: true,
            activated_at: new Date().toISOString()
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} activated!`, "success");
      }

      await fetchData();
    } catch (err) {
      console.error("Activation error:", err);
      showToast("Activation failed", "error");
      await fetchData();
    } finally {
      isActivating.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  return { shopItems, inventory, buyItem, activateItem, loading };
}
