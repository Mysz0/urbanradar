import React from 'react';
import { Home, Compass, Trophy, User, Terminal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isAdmin, colors, isShrunk }) {
  const navItems = [
    { id: 'home', icon: Home },
    { id: 'explore', icon: Compass },
    { id: 'leaderboard', icon: Trophy },
    { id: 'profile', icon: User },
    { id: 'dev', icon: Terminal, admin: true },
  ];

  return (
    <div className="flex justify-center w-full pointer-events-none">
      <div className={`
        ${colors.nav} pointer-events-auto backdrop-blur-3xl rounded-[2.5rem] 
        flex items-center border shadow-2xl shadow-black/20 
        /* Only transition layout properties at 700ms to avoid color lag */
        transition-[padding,gap,transform,margin] duration-700 ease-in-out
        ${isShrunk ? 'p-1 gap-0' : 'p-1.5 gap-1'}
      `}>
        {navItems.map((item) => (
          (!item.admin || isAdmin) && (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`
                /* Snap color instantly (letting global CSS handle the fade) */
                /* but keeping transform snappy for hover/active states */
                transition-transform duration-200 relative flex items-center justify-center rounded-[2rem]
                ${isShrunk ? 'p-3 px-4' : 'p-4 px-6'}
                ${activeTab === item.id 
                  ? 'bg-[rgb(var(--theme-primary))]/10 text-[rgb(var(--theme-primary))] scale-105' 
                  : 'text-zinc-500 hover:text-[rgb(var(--theme-primary))]/40 active:scale-95'}
              `}
            >
              <item.icon 
                size={isShrunk ? 18 : 20} 
                strokeWidth={activeTab === item.id ? 2.5 : 2}
                /* No transition here allows the global CSS transition to take over */
                className="transition-none"
              />
              
              {/* Active Indicator Dot */}
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
