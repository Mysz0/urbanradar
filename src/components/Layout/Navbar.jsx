import React from 'react';
import { Home, Compass, Trophy, User, Terminal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isAdmin, colors }) {
  const navItems = [
    { id: 'home', icon: Home },
    { id: 'explore', icon: Compass },
    { id: 'leaderboard', icon: Trophy },
    { id: 'profile', icon: User },
    { id: 'dev', icon: Terminal, admin: true },
  ];

  return (
    <nav className="fixed bottom-8 left-0 right-0 z-[5000] flex justify-center px-8 pointer-events-none">
      <div className={`${colors.nav} pointer-events-auto backdrop-blur-3xl rounded-[2.5rem] p-1.5 flex items-center border shadow-2xl shadow-black/20`}>
        {navItems.map((item) => (
          (!item.admin || isAdmin) && (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`p-4 px-6 rounded-[2rem] transition-all duration-500 relative flex items-center justify-center ${
                activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500 scale-110' 
                  : 'text-zinc-500 hover:text-emerald-500/40'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2}/>
              
              {activeTab === item.id && (
                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
              )}
            </button>
          )
        ))}
      </div>
    </nav>
  );
}
