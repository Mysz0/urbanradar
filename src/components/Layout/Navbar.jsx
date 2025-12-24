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
        flex items-center border shadow-2xl shadow-black/20 transition-all duration-700
        ${isShrunk ? 'p-1 gap-0' : 'p-1.5 gap-1'}
      `}>
        {navItems.map((item) => (
          (!item.admin || isAdmin) && (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`
                transition-all duration-500 relative flex items-center justify-center rounded-[2rem]
                ${isShrunk ? 'p-3 px-4' : 'p-4 px-6'}
                ${activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500 scale-105' 
                  : 'text-zinc-500 hover:text-emerald-500/40'}
              `}
            >
              <item.icon 
                size={isShrunk ? 18 : 20} 
                strokeWidth={activeTab === item.id ? 2.5 : 2}
              />
              
              {activeTab === item.id && !isShrunk && (
                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          )
        ))}
      </div>
    </div>
  );
}
