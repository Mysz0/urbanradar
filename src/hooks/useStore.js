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
    
    // Timed items: Use expires_at if available, otherwise calculate from activated_at + duration
    const now = new Date().getTime();
    let expiryTime;
    
    if (item.expires_at) {
      expiryTime = new Date(item.expires_at).getTime();
    } else {
      // Fallback for old data without expires_at
      const durationMs = item.shop_items.duration_hours * 60 * 60 * 1000;
      const startTime = new Date(item.activated_at).getTime();
      expiryTime = startTime + durationMs;
    }
    
    const diff = expiryTime - now;

    if (diff <= 0) return { timeLeft: "EXPIRED", progress: 0 };

    const totalDuration = expiryTime - new Date(item.activated_at).getTime();
    const progress = Math.max(0, Math.min(100, (diff / totalDuration) * 100));
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return { timeLeft: `${h}h ${m}m ${s}s`, progress };
  }, []);

  const deactivateExpiredItem = async (inventoryId) => {
    try {
      const { data: currentItem } = await supabase
        .from('user_inventory')
        .select('quantity, active_count, expires_at')
        .eq('id', inventoryId)
        .single();
      
      if (!currentItem) return;
      
      const activeCount = currentItem.active_count || 0;
      
      // If there are more stacks active, just decrement active_count (don't change expires_at)
      if (activeCount > 1) {
        await supabase
          .from('user_inventory')
          .update({ 
            active_count: activeCount - 1
          })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, active_count: activeCount - 1 }
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
          .update({ is_active: false, activated_at: null, active_count: 0, expires_at: null })
          .eq('id', inventoryId);
        
        setInventory(prev => prev.map(i => 
          i.id === inventoryId 
            ? { ...i, is_active: false, activated_at: null, active_count: 0, expires_at: null, timeLeft: null }
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
      
      // Clean up expired items: quantity=0 OR (active with expired timer)
      const now = new Date().getTime();
      const itemsToDelete = (inv || []).filter(item => {
        // Delete if quantity <= 0 and not a frozen freeze
        if (item.quantity <= 0 && item.shop_items?.icon_name !== 'Snowflake') {
          return true;
        }
        // Delete if active timer-based item has expired
        if (item.is_active && item.expires_at && item.shop_items?.duration_hours) {
          return new Date(item.expires_at).getTime() < now;
        }
        return false;
      });
      
      if (itemsToDelete.length > 0) {
        await supabase
          .from('user_inventory')
          .delete()
          .in('id', itemsToDelete.map(i => i.id));
      }
      
      // Keep: quantity > 0 OR (active streak freeze)
      const validInv = (inv || []).filter(item => {
        if (item.quantity > 0) return true;
        // Keep active streak freeze even if quantity 0 (it will be deleted when consumed)
        if (item.is_active && item.shop_items?.icon_name === 'Snowflake') return true;
        return false;
      });
      
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
        // Timed items: Use expires_at for accurate tracking
        const boostDurationMs = durationHours * 60 * 60 * 1000;
        const now = new Date();
        let newExpiresAt;
        let newActivatedAt;

        if (item.is_active && item.expires_at) {
          // EXTENDING: Add duration to current expiry
          const currentExpiry = new Date(item.expires_at).getTime();
          newExpiresAt = new Date(Math.max(currentExpiry, now.getTime()) + boostDurationMs).toISOString();
          newActivatedAt = item.activated_at; // Keep original start time
        } else {
          // FRESH START
          newActivatedAt = now.toISOString();
          newExpiresAt = new Date(now.getTime() + boostDurationMs).toISOString();
        }

        const currentActiveCount = item.active_count || 0;

        const { error } = await supabase
          .from('user_inventory')
          .update({
            quantity: item.quantity - 1,
            active_count: currentActiveCount + 1,
            is_active: true,
            activated_at: newActivatedAt,
            expires_at: newExpiresAt
          })
          .eq('id', inventoryId);

        if (error) throw error;
        showToast(`${item.shop_items.name} ${item.is_active ? 'extended' : 'activated'}! (${currentActiveCount + 1}x)`, "success");
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
