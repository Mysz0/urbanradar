import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

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
      deleteExpiredItem(item.id);
      return { timeLeft: "EXPIRED", progress: 0 };
    }

    const progress = Math.max(0, Math.min(100, (diff / durationMs) * 100));
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { timeLeft: `${h}h ${m}m ${s}s`, progress };
  };

  const deleteExpiredItem = async (inventoryId) => {
    try {
      await supabase.from('user_inventory').delete().eq('id', inventoryId);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setInventory(prevInv => {
        const updated = prevInv.map(item => {
          if (item.is_active) {
            return { ...item, ...getItemStatus(item) };
          }
          return item;
        });
        return updated.filter(item => item.timeLeft !== "EXPIRED");
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [inventory.length]);

  const buyItem = async (item) => {
    if (totalPoints < item.price || loading) return;
    setLoading(true);
    try {
      const existing = inventory.find(i => i.item_id === item.id && !i.is_active);
      if (existing) {
        await supabase.from('user_inventory')
          .update({ quantity: (existing.quantity || 1) + 1 })
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
      showToast("Purchase failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const activateItem = async (inventoryId) => {
    if (!user || loading) return;
    
    const itemToActivate = inventory.find(inv => inv.id === inventoryId);
    if (!itemToActivate || itemToActivate.is_active) return;

    setLoading(true);

    try {
      // Find if there is ALREADY an active row for this item type
      const activeRow = inventory.find(
        inv => inv.item_id === itemToActivate.item_id && inv.is_active
      );

      const boostDurationMs = itemToActivate.shop_items.duration_hours * 60 * 60 * 1000;

      if (activeRow) {
        // --- STACKING TIME ---
        // Add the new boost duration to the current active row's time
        const currentActivation = new Date(activeRow.activated_at).getTime();
        const newActivationDate = new Date(currentActivation + boostDurationMs);

        await supabase
          .from('user_inventory')
          .update({ activated_at: newActivationDate.toISOString() })
          .eq('id', activeRow.id);

        // Remove 1 from the inventory stack
        if (itemToActivate.quantity > 1) {
          await supabase.from('user_inventory')
            .update({ quantity: itemToActivate.quantity - 1 })
            .eq('id', itemToActivate.id);
        } else {
          await supabase.from('user_inventory').delete().eq('id', inventoryId);
        }
        showToast(`${itemToActivate.shop_items.name} Extended!`, "success");
      } else {
        // --- FIRST ACTIVATION ---
        if (itemToActivate.quantity > 1) {
          // If a stack exists, keep the stack but create one active row
          await supabase.from('user_inventory')
            .update({ quantity: itemToActivate.quantity - 1 })
            .eq('id', itemToActivate.id);

          await supabase.from('user_inventory').insert({
            user_id: user.id,
            item_id: itemToActivate.item_id,
            quantity: 1,
            is_active: true,
            activated_at: new Date().toISOString()
          });
        } else {
          // Flip the only existing row to active
          await supabase.from('user_inventory')
            .update({ 
              is_active: true, 
              activated_at: new Date().toISOString() 
            })
            .eq('id', inventoryId);
        }
        showToast(`${itemToActivate.shop_items.name} Activated!`, "success");
      }

      await fetchData(); 
    } catch (err) {
      console.error(err);
      showToast("Activation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  return { shopItems, inventory, buyItem, activateItem, loading };
}
