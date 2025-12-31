import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Sparkles, 
  Coins, 
  Zap, 
  Maximize, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Palette,
  Lock,
  Leaf,
  Snowflake,
  Waves,
  Flower,
  Fish,
  Shell,
  Layers
} from 'lucide-react';

export default function StoreTab({ totalPoints, shopItems = [], inventory = [], onBuy, onActivate, onBuyTheme, unlockedThemes = ['emerald', 'winter'], isDark }) {
  const [view, setView] = useState('shop');
  const [confirmItem, setConfirmItem] = useState(null);
  const [confirmTheme, setConfirmTheme] = useState(null);

  const iconMap = {
    Zap: <Zap size={24} className="text-yellow-400" />,
    Maximize: <Maximize size={24} className="text-blue-400" />,
    Snowflake: <Snowflake size={24} className="text-cyan-400" />
  };

  // Theme definitions with prices and icons
  const themes = [
    { id: 'koi', name: 'Koi', price: 50, icon: Waves, color: '#EA4426' },
    { id: 'sakura', name: 'Sakura', price: 100, icon: Flower, color: '#F4ACB7' },
    { id: 'salmon', name: 'Salmon', price: 150, icon: Fish, color: '#FF8C73' },
    { id: 'abyss', name: 'Abyss', price: 200, icon: Shell, color: '#FB923C' },
    { id: 'aurora', name: 'Aurora', price: 300, icon: Sparkles, color: '#a78bfa' },
    { id: 'marble', name: 'Marble', price: 250, icon: Layers, color: '#A1A1AA' },
  ];

  const handleBuyTheme = (theme) => {
    if (onBuyTheme) {
      onBuyTheme(theme.id, theme.price);
    }
    setConfirmTheme(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      
      {/* Confirmation Modal */}
      {confirmItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="smart-glass border border-white/10 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
              <AlertCircle className="text-yellow-500" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2">Confirm?</h3>
            <p className="opacity-50 text-[10px] mb-6 uppercase tracking-widest font-bold">
              Spend {confirmItem.price} XP for {confirmItem.name}?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmItem(null)} 
                className="flex-1 py-4 rounded-2xl bg-current/10 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button 
                onClick={() => { onBuy(confirmItem); setConfirmItem(null); }} 
                className="flex-1 py-4 rounded-2xl bg-[rgb(var(--theme-primary))] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--theme-primary-glow)] active:scale-95 transition-transform"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Confirmation Modal */}
      {confirmTheme && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="smart-glass border border-white/10 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10" style={{ background: confirmTheme.color }}>
              <Palette className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2">Unlock {confirmTheme.name}?</h3>
            <p className="opacity-50 text-[10px] mb-6 uppercase tracking-widest font-bold">
              Spend {confirmTheme.price} XP for this theme?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmTheme(null)} 
                className="flex-1 py-4 rounded-2xl bg-current/10 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleBuyTheme(confirmTheme)} 
                className="flex-1 py-4 rounded-2xl bg-[rgb(var(--theme-primary))] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--theme-primary-glow)] active:scale-95 transition-transform"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="smart-glass p-8 rounded-[3rem] border border-current/5 relative shadow-xl">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Available Balance</p>
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-500" size={20} />
            <h3 className="text-4xl font-black tracking-tighter">
              {totalPoints?.toLocaleString() || 0}
            </h3>
            <span className="text-xs font-bold opacity-30 mt-2">XP</span>
          </div>
        </div>
        <div 
          className="absolute -right-4 -top-4 opacity-10 rotate-12 overflow-hidden" 
          style={{ color: 'rgb(var(--theme-primary))' }}
        >
          <Sparkles size={140} />
        </div>
      </div>

      {/* Switcher */}
      <div className="flex p-1.5 smart-glass rounded-[2rem] border border-current/5 mx-4">
        <button onClick={() => setView('shop')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.6rem] transition-all duration-500 ${view === 'shop' ? 'bg-[rgb(var(--theme-primary))] text-white shadow-lg shadow-[var(--theme-primary-glow)]' : 'opacity-40'}`}>
          <ShoppingCart size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={() => setView('themes')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.6rem] transition-all duration-500 ${view === 'themes' ? 'bg-[rgb(var(--theme-primary))] text-white shadow-lg shadow-[var(--theme-primary-glow)]' : 'opacity-40'}`}>
          <Palette size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Themes</span>
        </button>
        <button onClick={() => setView('inventory')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.6rem] transition-all duration-500 ${view === 'inventory' ? 'bg-[rgb(var(--theme-primary))] text-white shadow-lg shadow-[var(--theme-primary-glow)]' : 'opacity-40'}`}>
          <Package size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Inventory</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        {view === 'themes' ? (
          /* Theme Shop Grid */
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => {
              const isUnlocked = unlockedThemes.includes(theme.id);
              const canAfford = totalPoints >= theme.price;
              const ThemeIcon = theme.icon;
              return (
                <button
                  key={theme.id}
                  onClick={() => !isUnlocked && canAfford && setConfirmTheme(theme)}
                  disabled={isUnlocked || !canAfford}
                  className={`relative p-4 rounded-[2rem] border transition-all duration-300 ${
                    isUnlocked 
                      ? 'smart-glass border-[rgb(var(--theme-primary))]/50 bg-[rgb(var(--theme-primary))]/10' 
                      : canAfford
                        ? 'smart-glass border-current/10 hover:border-[rgb(var(--theme-primary))]/30 active:scale-95'
                        : 'smart-glass border-current/5 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div 
                    className={`w-12 h-12 rounded-xl mx-auto mb-3 shadow-lg flex items-center justify-center ${
                      isUnlocked ? 'opacity-60' : ''
                    }`}
                    style={{ background: theme.color }}
                  >
                    <ThemeIcon size={24} className="text-white" />
                  </div>
                  <p className="font-bold text-sm capitalize mb-1">{theme.name}</p>
                  {isUnlocked ? (
                    <div className="flex items-center justify-center gap-1 text-[rgb(var(--theme-primary))]">
                      <CheckCircle2 size={12} />
                      <span className="text-[9px] font-black uppercase">Owned</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Lock size={10} className="opacity-50" />
                      <span className="text-[10px] font-black opacity-60">{theme.price} XP</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : view === 'shop' ? (
          shopItems.filter(item => item.category !== 'theme').map((item) => (
            <div key={item.id} className="smart-glass p-5 rounded-[2.5rem] border border-current/5 flex items-center justify-between group transition-all hover:border-[rgb(var(--theme-primary))]/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-current/[0.03] flex items-center justify-center border border-current/5">
                  {iconMap[item.icon_name] || <Sparkles className="opacity-20" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-none mb-1">
                    {item.name}
                  </h4>
                  <p className="text-[10px] opacity-40 max-w-[150px] font-medium leading-tight">{item.description}</p>
                </div>
              </div>
              <button 
                onClick={() => setConfirmItem(item)}
                disabled={totalPoints < item.price}
                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
                  totalPoints >= item.price 
                  ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 active:scale-95 shadow-lg shadow-[var(--theme-primary-glow)]' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                  }`}
              >
                {item.price} XP
              </button>
            </div>
          ))
        ) : (
          inventory.filter(inv => inv.shop_items?.category !== 'theme').length > 0 ? (
            [...inventory]
              .filter(inv => inv.shop_items?.category !== 'theme')
              .sort((a, b) => (a.shop_items?.name || "").localeCompare(b.shop_items?.name || ""))
              .map((inv) => (
              <div key={inv.id} className="smart-glass p-5 rounded-[2.5rem] border border-current/5 flex items-center gap-4 relative overflow-hidden group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 relative transition-all duration-500 ${(inv.activated || 0) > 0 ? 'bg-[rgb(var(--theme-primary))]/20 shadow-[0_0_15px_rgba(var(--theme-primary),0.3)]' : 'bg-current/[0.03]'}`}>
                  {(inv.activated || 0) > 0 ? <CheckCircle2 size={24} className="text-[rgb(var(--theme-primary))]" /> : (iconMap[inv.shop_items?.icon_name] || <Package size={24} className="opacity-40" />)}
                  
                  {(inv.available || 0) > 0 && (
                    <div className="absolute -top-1 -right-1 bg-[rgb(var(--theme-primary))] text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-[var(--theme-map-bg)] shadow-lg">
                      {inv.available}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 z-10">
                  <h4 className="font-bold text-sm leading-none mb-1">
                    {inv.shop_items?.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${(inv.activated || 0) > 0 ? 'text-[rgb(var(--theme-primary))]' : 'opacity-40'}`}>
                      {inv.isStreakFreeze 
                        ? `Protected (${inv.activated ?? 0})`
                        : ((inv.activated || 0) > 0 ? 'System Online' : 'Standby')}
                    </p>
                    {(inv.activated || 0) > 0 && inv.timeLeft && !inv.isStreakFreeze && (
                      <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                        <Clock size={8} className="text-[rgb(var(--theme-primary))]" />
                        <span className="text-[9px] font-mono font-bold text-white/90">{inv.timeLeft}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Only show Engage/Extend button for timed items, not streak freeze */}
                {(inv.available || 0) > 0 && !inv.isStreakFreeze && (
                  <button 
                    onClick={() => onActivate(inv.id)}
                    className="z-10 text-[9px] font-black bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))] px-4 py-2.5 rounded-xl hover:bg-[rgb(var(--theme-primary))]/20 transition-all border border-[rgb(var(--theme-primary))]/20 active:scale-90 uppercase tracking-widest"
                  >
                    {(inv.activated || 0) > 0 ? 'Extend' : 'Engage'}
                  </button>
                )}

                {(inv.activated || 0) > 0 && !inv.isStreakFreeze && inv.progress !== undefined && (
                  <div className="absolute bottom-0 left-5 right-5 h-0.5 overflow-hidden rounded-b-2xl">
                    <div 
                      className="h-full bg-[rgb(var(--theme-primary))] transition-all duration-1000 ease-linear"
                      style={{ width: `${inv.progress}%` }}
                    />
                  </div>
                )}
                
                {(inv.activated || 0) > 0 && (
                  <div className="absolute inset-0 bg-[rgb(var(--theme-primary))]/5 pointer-events-none animate-pulse" />
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 opacity-20">
              <Package size={48} className="mx-auto mb-4 stroke-[1px]" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Neural link empty</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
