import React from 'react';
import { LogOut, Flame } from 'lucide-react';

export default function Header({ isAdmin, username, email, showEmail, isDark, logoutMag, handleLogout, streak = 0 }) {
  return (
    // Reduced padding (pt-12 pb-24) to make it feel less "deep"
    <header className="relative pt-12 pb-24 px-10 rounded-b-[3.5rem] border-b border-white/[0.05] overflow-hidden">
      {/* Background Overlays */}
      <div className="absolute inset-0 mist-overlay z-0" />
      <div className={`absolute inset-0 ${isDark ? 'bg-zinc-950/40' : 'bg-white/10'} backdrop-blur-3xl z-10`} />
      
      <div className="max-w-md mx-auto flex justify-between items-end relative z-20">
        {/* LEFT: Identity Section */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 mb-1.5">
             {isAdmin ? (
               <span className="text-[6.5px] font-black tracking-[0.15em] text-[rgb(var(--theme-primary))] bg-[rgb(var(--theme-primary))]/10 px-1.5 py-0.5 rounded-md border border-[rgb(var(--theme-primary))]/20 uppercase">
                 Admin
               </span>
             ) : (
               <span className="text-[6.5px] font-black tracking-[0.15em] text-zinc-500 uppercase">
                 Explorer
               </span>
             )}

              {/* STREAK: Minimalist compact design */}
              {streak > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                  <Flame size={8} className="text-orange-500 fill-orange-500" />
                  <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter">
                    {streak}D
                  </span>
                </div>
              )}
          </div>
          
          <h1 className="text-2xl font-black tracking-tighter italic uppercase leading-none truncate">
            {username || 'Hunter'}<span className="text-[rgb(var(--theme-primary))] font-normal">.</span>
          </h1>

          {showEmail && email && (
            <p className="mt-1 text-[9px] font-medium text-zinc-500 lowercase opacity-60 truncate tracking-tight">
              {email}
            </p>
          )}
        </div>
        
        {/* RIGHT: Button Group */}
        <div className="flex items-center shrink-0 relative">
          <button 
            ref={logoutMag.ref} 
            onMouseMove={logoutMag.handleMouseMove} 
            onMouseLeave={logoutMag.reset}
            onClick={handleLogout} 
            style={{ 
              transform: `translate(${logoutMag.position.x}px, ${logoutMag.position.y}px)`,
              transition: logoutMag.position.x === 0 ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
            }}
            className={`p-3 rounded-xl border transition-all duration-300 z-30 shrink-0 ${
              isDark 
              ? 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-red-400 hover:bg-red-500/10' 
              : 'bg-white border-zinc-200 text-zinc-400 shadow-sm'
            }`}
          >
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </header>
  );
}
