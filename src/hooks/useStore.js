import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

export function useStore(user, totalPoints, setTotalPoints, showToast) {
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const isActivating = useRef(false);

  // --- DYNAMIC BONUSES (Reactive to Inventory Changes) ---
  const bonuses = useMemo(() => {
    const hasXPBoost = inventory.some(
      (inv) => (inv.activated || 0) > 0 && inv.shop_items?.icon_name === 'Zap'
    );

    const hasRadiusBoost = inventory.some(
      (inv) => (inv.activated || 0) > 0 && inv.shop_items?.icon_name === 'Maximize'
    );

    const hasStreakFreeze = inventory.some(
      (inv) => (inv.activated || 0) > 0 && inv.shop_items?.icon_name === 'Snowflake'
    );

    return {
      xpMultiplier: hasXPBoost ? 1.5 : 1.0,
      radiusBonus: hasRadiusBoost ? 30 : 0,
      isActive: {
        xp: hasXPBoost,
        radius: hasRadiusBoost,
        streakFreeze: hasStreakFreeze
      }
    };
  }, [inventory]);

  const getItemStatus = useCallback((item) => {
    // No active boosts
    if (!item.activated || item.activated <= 0) {
      return { timeLeft: null, progress: 100, isActive: false };
    }
    
    // Check if expires_at exists for timed items
    if (!item.expires_at) {
      return { timeLeft: null, progress: 100, isActive: false };
    }
    
    const now = new Date().getTime();
    const expiryTime = new Date(item.expires_at).getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return { timeLeft: "EXPIRED", progress: 0, isActive: true };

    // Calculate progress based on single stack duration (1 hour per stack)
    const singleStackDuration = (item.shop_items?.duration_hours || 1) * 60 * 60 * 1000;
    const totalDuration = singleStackDuration * (item.activated || 1);
    const progress = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { timeLeft: `${h}h ${m}m ${s}s`, progress, isActive: true };
  }, []);

  const deactivateExpiredItem = async (inventoryId) => {
    try {
      const { data: currentItem } = await supabase
        .from('user_inventory')
        .select('available, activated, expires_at')
        .eq('id', inventoryId)
        .single();
      
      if (!currentItem) return;
      
      // If more stacks active, just decrement activated
      if (currentItem.activated > 1) {
        await supabase
          .from('user_inventory')
          .update({ 
            activated: currentItem.activated - 1
          })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, activated: currentItem.activated - 1 }
            : i
        ));
      } else if (currentItem.available <= 0 && currentItem.activated <= 1) {
        // Delete if no available and last stack expired
        await supabase
          .from('user_inventory')
          .delete()
          .eq('id', inventoryId);
        
        setInventory(prev => prev.filter(i => i.id !== inventoryId));
      } else {
        // Last stack expired but available remains, just deactivate
        await supabase
          .from('user_inventory')
          .update({ activated: 0, expires_at: null })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, activated: 0, expires_at: null, timeLeft: null, isActive: false }
            : i
        ));
      }
    } catch (err) {
      console.error("Auto-deactivate failed:", err);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: items } = await supabase.from('shop_items').select('*');
      const { data: inv } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', user.id);
      
      // Clean up expired items: available=0 and activated=0
      const itemsToDelete = (inv || []).filter(item => {
        return item.available <= 0 && item.activated <= 0;
      });
      
      if (itemsToDelete.length > 0) {
        await supabase
          .from('user_inventory')
          .delete()
          .in('id', itemsToDelete.map(i => i.id));
      }
      
      // Keep all items with available > 0 OR activated > 0
      const validInv = (inv || []).filter(item => item.available > 0 || item.activated > 0);
      
      const processedInv = validInv.map(item => {
        const status = getItemStatus(item);
        if (status.timeLeft === "EXPIRED") {
          deactivateExpiredItem(item.id);
          return { ...item, activated: 0, expires_at: null, timeLeft: null, isActive: false };
        }
        return { ...item, ...status };
      });

      setShopItems(items || []);
      setInventory(processedInv);
    } catch (err) {
      console.error("Store fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getItemStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setInventory(prevInv => 
        prevInv.map(item => {
          if ((item.activated || 0) > 0) {
            const status = getItemStatus(item);
            if (status.timeLeft === "EXPIRED") {
              deactivateExpiredItem(item.id);
              return { ...item, activated: 0, expires_at: null };
            }
            return { ...item, ...status };
          }
          return item;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [getItemStatus]);

  const buyItem = async (item) => {
    if (totalPoints < item.price || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('purchase_item', {
        p_user_id: user.id,
        p_price: item.price,
        p_item_id: item.id,
        p_theme_name: null
      });

      if (error) {
        showToast(error.message || "Purchase failed", "error");
        setLoading(false);
        return;
      }

      if (data.error) {
        showToast(data.error, "error");
        setLoading(false);
        return;
      }

      setTotalPoints(data.newPoints);
      
      // Auto-activate streak freeze items (they stack on same row due to unique index)
      if (item.icon_name === 'Snowflake' || !item.duration_hours) {
        setTimeout(async () => {
          const { data: inv } = await supabase
            .from('user_inventory')
            .select('id, activated')
            .eq('user_id', user.id)
            .eq('item_id', item.id)
            .single();
          
          // Only activate if not already active (first purchase)
          if (inv && !inv.activated) {
            await supabase
              .from('user_inventory')
              .update({ 
                activated: 1
              })
              .eq('id', inv.id);
          }
          // If already active, available was already incremented by purchase_item
          await fetchData();
        }, 100);
      } else {
        // For timed items (XP boost, radius), fetch data immediately to show in inventory
        await fetchData();
      }
      
      showToast(`Purchased ${item.name}!`, "success");
    } catch (err) {
      console.error('Purchase error:', err);
      showToast("Purchase failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const buyTheme = async (themeName, price, onSuccess) => {
    if (totalPoints < price) {
      showToast(`Need ${price}XP (You have ${totalPoints}XP)`, "error");
      return;
    }
    
    if (loading) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('purchase_item', {
        p_user_id: user.id,
        p_price: price,
        p_item_id: null,
        p_theme_name: themeName
      });

      if (error) {
        showToast(error.message || "Purchase failed", "error");
        setLoading(false);
        return;
      }

      if (data.error) {
        showToast(data.error, "error");
        setLoading(false);
        return;
      }

      setTotalPoints(data.newPoints);
      showToast(`Unlocked ${themeName} theme!`, 'success');
      onSuccess?.();
      await fetchData();
    } catch (err) {
      console.error('Purchase error:', err);
      showToast("Purchase failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const activateItem = async (inventoryId) => {
    if (!user || loading || isActivating.current) return;
    
    const item = inventory.find(inv => inv.id === inventoryId);
    if (!item || item.available < 1) return;

    isActivating.current = true;
    setLoading(true);

    try {
      const durationHours = item.shop_items?.duration_hours;
      const isStreakFreeze = !durationHours;
      
      if (isStreakFreeze) {
        // Streak Freeze: Decrement available, increment activated (represents active protections)
        const newAvailable = item.available - 1;
        const newActivated = (item.activated || 0) + 1;
        
        const { error } = await supabase
          .from('user_inventory')
          .update({
            available: newAvailable,
            activated: newActivated
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} activated! ${newActivated} protection${newActivated > 1 ? 's' : ''} ready.`, "success");
      } else {
        // Timed items: available counts how many unused boosts, activated counts stacks
        const newAvailable = item.available - 1; // Consume one boost
        const currentActivated = item.activated || 0;
        const newActivated = currentActivated + 1;
        
        const boostDurationMs = durationHours * 60 * 60 * 1000;
        const now = new Date();
        let newExpiresAt;

        if (currentActivated > 0 && item.expires_at) {
          // EXTENDING: Add duration to current expiry
          const currentExpiry = new Date(item.expires_at).getTime();
          newExpiresAt = new Date(Math.max(currentExpiry, now.getTime()) + boostDurationMs).toISOString();
        } else {
          // FRESH START
          newExpiresAt = new Date(now.getTime() + boostDurationMs).toISOString();
        }

        const { error } = await supabase
          .from('user_inventory')
          .update({
            available: newAvailable,
            activated: newActivated,
            expires_at: newExpiresAt
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} ${currentActivated > 0 ? 'extended' : 'activated'}! (${newActivated}x)`, "success");
      }
      
      await fetchData();
    } catch (err) {
      console.error("Activation error:", err);
      showToast("Activation failed", "error");
    } finally {
      isActivating.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  return { shopItems, inventory, buyItem, activateItem, loading, bonuses, buyTheme };
}
