import React from 'react';
import { Home, Compass, Trophy, ShoppingBag, User, Terminal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isAdmin, colors, isShrunk }) {
  const navItems = [
    { id: 'home', icon: Home },
    { id: 'explore', icon: Compass },
    { id: 'leaderboard', icon: Trophy },
    { id: 'store', icon: ShoppingBag }, // New Shop & Inventory Tab
    { id: 'profile', icon: User },
    { id: 'dev', icon: Terminal, admin: true },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 flex justify-center w-full pointer-events-none z-50">
      <div className={`
        ${colors.nav} pointer-events-auto backdrop-blur-3xl rounded-[2.5rem] 
        flex items-center border shadow-2xl shadow-black/20 
        w-[92%] max-w-[420px]
        transition-[padding,gap,transform,width] duration-700 ease-in-out
        ${isShrunk ? 'p-1 gap-0' : 'p-1.5 gap-1'}
      `}>
        {navItems.map((item) => (
          (!item.admin || isAdmin) && (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`
                relative flex flex-1 items-center justify-center rounded-[2rem]
                transition-transform duration-200 ease-out
                ${isShrunk ? 'p-3' : 'p-4'}
                ${activeTab === item.id 
                  ? 'bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))] scale-105' 
                  : 'text-zinc-500 hover:text-[rgb(var(--theme-primary))]/60 active:scale-95'}
              `}
            >
              <item.icon 
                size={isShrunk ? 18 : 20} 
                strokeWidth={activeTab === item.id ? 2.5 : 2}
                className="block"
              />
              
              {activeTab === item.id && !isShrunk && (
                <div className="absolute -bottom-1 w-1 h-1 bg-[rgb(var(--theme-primary))] rounded-full shadow-[0_0_8px_var(--theme-primary-glow)]" />
              )}
            </button>
          )
        ))}
      </div>
    </div>
  );
}
