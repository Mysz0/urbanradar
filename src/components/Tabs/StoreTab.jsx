import React, { useState } from 'react';
import { ShoppingCart, Package, Sparkles, Coins, Zap, Maximize, CheckCircle2 } from 'lucide-react';

export default function StoreTab({ totalPoints, colors, shopItems = [], inventory = [], onBuy, onActivate }) {
  const [view, setView] = useState('shop');

  const iconMap = {
    Zap: <Zap size={24} className="text-yellow-400" />,
    Maximize: <Maximize size={24} className="text-blue-400" />
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      {/* Balance Card */}
      <div className={`${colors.card} p-6 rounded-[2.5rem] border border-white/5 overflow-hidden relative`}>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Available Balance</p>
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-500" size={20} />
            <h3 className="text-3xl font-black tracking-tighter">
              {totalPoints?.toLocaleString() || 0}
            </h3>
            <span className="text-xs font-bold opacity-40 mt-2">XP</span>
          </div>
        </div>
        <Sparkles className="absolute -right-4 -top-4 opacity-10 text-[rgb(var(--theme-primary))]" size={120} />
      </div>

      {/* Switcher */}
      <div className="flex p-1.5 bg-white/5 rounded-[2rem] border border-white/5 mx-4">
        <button onClick={() => setView('shop')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1.6rem] transition-all ${view === 'shop' ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>
          <ShoppingCart size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Market</span>
        </button>
        <button onClick={() => setView('inventory')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1.6rem] transition-all ${view === 'inventory' ? 'bg-[rgb(var(--theme-primary))] text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>
          <Package size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Inventory</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2">
        {view === 'shop' ? (
          shopItems.map((item) => (
            <div key={item.id} className={`${colors.card} p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  {iconMap[item.icon_name] || <Sparkles />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{item.name}</h4>
                  <p className="text-[10px] text-zinc-400 max-w-[150px] leading-tight">{item.description}</p>
                </div>
              </div>
              <button 
                onClick={() => onBuy(item)}
                disabled={totalPoints < item.price}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${
                  totalPoints >= item.price 
                  ? 'bg-white text-zinc-950 active:scale-95' 
                  : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {item.price} XP
              </button>
            </div>
          ))
        ) : (
          inventory.length > 0 ? (
            inventory.map((inv) => (
              <div key={inv.id} className={`${colors.card} p-5 rounded-[2rem] border border-white/5 flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inv.is_active ? 'bg-[rgb(var(--theme-primary))]/20 shadow-[0_0_15px_rgba(var(--theme-primary),0.3)]' : 'bg-white/5'}`}>
                  {inv.is_active ? <CheckCircle2 size={20} className="text-[rgb(var(--theme-primary))]" /> : (iconMap[inv.shop_items?.icon_name] || <Package size={20} />)}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white">{inv.shop_items?.name}</h4>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${inv.is_active ? 'text-[rgb(var(--theme-primary))]' : 'text-zinc-500'}`}>
                    {inv.is_active ? 'Currently Active' : 'In Stock'}
                  </p>
                </div>
                {inv.shop_items?.category === 'boost' && !inv.is_active && (
                  <button 
                    onClick={() => onActivate(inv.id)}
                    className="text-[9px] font-black bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))] px-4 py-2 rounded-xl hover:bg-[rgb(var(--theme-primary))]/20 transition-colors border border-[rgb(var(--theme-primary))]/20"
                  >
                    ACTIVATE
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 opacity-30">
              <Package size={40} className="mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Your inventory is empty</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
