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
      (inv) => inv.is_active && inv.shop_items?.icon_name === 'Zap'
    );

    const hasRadiusBoost = inventory.some(
      (inv) => inv.is_active && inv.shop_items?.icon_name === 'Maximize'
    );

    const hasStreakFreeze = inventory.some(
      (inv) => inv.is_active && inv.shop_items?.icon_name === 'Snowflake'
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
    if (!item.is_active || !item.activated_at) {
      return { timeLeft: null, progress: 100 };
    }
    
    // Items with no duration (like Streak Freeze) show protection count
    if (!item.shop_items?.duration_hours) {
      const protections = item.quantity || 0;
      return { 
        timeLeft: `${protections} protection${protections !== 1 ? 's' : ''} ready`, 
        progress: 100,
        isStreakFreeze: true 
      };
    }
    
    // Timed items: Show time based on active_count stacks
    const activeCount = item.active_count || 1;
    const durationMs = item.shop_items.duration_hours * 60 * 60 * 1000 * activeCount;
    const startTime = new Date(item.activated_at).getTime();
    const expiryTime = startTime + durationMs;
    const now = new Date().getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return { timeLeft: "EXPIRED", progress: 0 };

    const progress = Math.max(0, Math.min(100, (diff / durationMs) * 100));
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { timeLeft: `${h}h ${m}m ${s}s`, progress };
  }, []);

  const deactivateExpiredItem = async (inventoryId) => {
    try {
      const { data: currentItem } = await supabase
        .from('user_inventory')
        .select('quantity, active_count')
        .eq('id', inventoryId)
        .single();
      
      if (!currentItem) return;
      
      const activeCount = currentItem.active_count || 0;
      
      // If there are more stacks active, just decrement active_count
      if (activeCount > 1) {
        await supabase
          .from('user_inventory')
          .update({ 
            active_count: activeCount - 1,
            activated_at: new Date().toISOString() // Reset timer for remaining stacks
          })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, active_count: activeCount - 1, activated_at: new Date().toISOString() }
            : i
        ));
      } else if (currentItem.quantity <= 0) {
        // No quantity left and last stack expired, delete
        await supabase
          .from('user_inventory')
          .delete()
          .eq('id', inventoryId);
        
        setInventory(prev => prev.filter(i => i.id !== inventoryId));
      } else {
        // Last stack expired but quantity remains, deactivate
        await supabase
          .from('user_inventory')
          .update({ is_active: false, activated_at: null, active_count: 0 })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, is_active: false, activated_at: null, active_count: 0, timeLeft: null }
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
      
      // Clean up items with 0 quantity UNLESS they're active (like streak freeze)
      const itemsToDelete = (inv || []).filter(item => item.quantity <= 0 && !item.is_active);
      if (itemsToDelete.length > 0) {
        await supabase
          .from('user_inventory')
          .delete()
          .in('id', itemsToDelete.map(i => i.id));
      }
      
      // Keep items with quantity > 0 OR active items (even if quantity is 0)
      const validInv = (inv || []).filter(item => item.quantity > 0 || item.is_active);
      
      const processedInv = validInv.map(item => {
        const status = getItemStatus(item);
        if (status.timeLeft === "EXPIRED") {
          deactivateExpiredItem(item.id);
          return { ...item, is_active: false, timeLeft: null };
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
          if (item.is_active) {
            const status = getItemStatus(item);
            if (status.timeLeft === "EXPIRED") {
              deactivateExpiredItem(item.id);
              return { ...item, is_active: false };
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
            .select('id, is_active')
            .eq('user_id', user.id)
            .eq('item_id', item.id)
            .single();
          
          // Only activate if not already active (first purchase)
          if (inv && !inv.is_active) {
            await supabase
              .from('user_inventory')
              .update({ 
                is_active: true, 
                activated_at: new Date().toISOString() 
              })
              .eq('id', inv.id);
          }
          // If already active, quantity was already incremented by purchase_item
          await fetchData();
        }, 100);
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
    if (!item || item.quantity < 1) return;

    isActivating.current = true;
    setLoading(true);

    try {
      const durationHours = item.shop_items?.duration_hours;
      const isStreakFreeze = !durationHours;
      
      if (isStreakFreeze) {
        // Streak Freeze: Just activate, quantity stays as-is (represents protections)
        const { error } = await supabase
          .from('user_inventory')
          .update({
            is_active: true,
            activated_at: new Date().toISOString()
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} activated! ${item.quantity} protection${item.quantity > 1 ? 's' : ''} ready.`, "success");
      } else {
        // Timed items: Use active_count to track stacks, decrement quantity
        const currentActiveCount = item.active_count || 0;
        const boostDurationMs = durationHours * 60 * 60 * 1000;
        let finalActivationAt;

        if (item.is_active && item.activated_at) {
          // EXTENSION: Calculate new expiry based on current + new duration
          const currentStartTime = new Date(item.activated_at).getTime();
          const currentExpiry = currentStartTime + (boostDurationMs * currentActiveCount);
          const newExpiry = currentExpiry + boostDurationMs;
          finalActivationAt = new Date(newExpiry - (boostDurationMs * (currentActiveCount + 1))).toISOString();
        } else {
          // FRESH START
          finalActivationAt = new Date().toISOString();
        }

        const { error } = await supabase
          .from('user_inventory')
          .update({
            quantity: item.quantity - 1,
            active_count: currentActiveCount + 1,
            is_active: true,
            activated_at: finalActivationAt
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} ${item.is_active ? 'extended' : 'activated'}! (${currentActiveCount + 1}x active)`, "success");
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
