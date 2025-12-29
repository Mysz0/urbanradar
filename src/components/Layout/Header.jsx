import React from 'react';
import { LogOut } from 'lucide-react';

export default function Header({ isAdmin, username, email, showEmail, isDark, logoutMag, handleLogout }) {
  return (
    <header className="relative pt-16 pb-32 px-10 rounded-b-[4.5rem] border-b transition-colors duration-500 border-current/5">
      {/* Background Overlays */}
      <div className="absolute inset-0 mist-overlay z-0 rounded-b-[4.5rem] overflow-hidden opacity-50" />
      
      {/* Dynamic Background using smart-glass logic */}
      <div className="absolute inset-0 transition-colors duration-500 bg-current/[0.03] backdrop-blur-3xl z-10 rounded-b-[4.5rem]" />
      
      <div className="max-w-md mx-auto flex justify-between items-center relative z-20">
        {/* LEFT: Identity Section */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
             {isAdmin ? (
               <span className="text-[7px] font-black tracking-[0.2em] text-[rgb(var(--theme-primary))] bg-[rgb(var(--theme-primary))]/10 px-2 py-0.5 rounded-full border border-[rgb(var(--theme-primary))]/20 uppercase">
                 Admin Access
               </span>
             ) : (
               <span className="text-[7px] font-black tracking-[0.2em] uppercase opacity-40">
                 Explorer Mode
               </span>
             )}
          </div>
          
          <h1 className="text-3xl font-bold tracking-tighter italic uppercase leading-none truncate transition-colors duration-500">
            {username || ''}<span className="text-[rgb(var(--theme-primary))] font-normal">.</span>
          </h1>

          <div className="relative h-0">
            {showEmail && email && (
              <p className="absolute top-1 left-0 text-[10px] font-medium lowercase opacity-40 truncate tracking-wide w-full">
                {email}
              </p>
            )}
          </div>
        </div>
        
        {/* RIGHT: Button Group */}
        <div className="flex items-center gap-3 shrink-0 h-[46px] relative">
          <div className="w-[46px]" /> 

          <button 
            ref={logoutMag.ref} 
            onMouseMove={logoutMag.handleMouseMove} 
            onMouseLeave={logoutMag.reset}
            onClick={handleLogout} 
            style={{ 
              transform: `translate(${logoutMag.position.x}px, ${logoutMag.position.y}px)`,
              transition: logoutMag.position.x === 0 ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
            }}
            
            className="p-3.5 rounded-2xl border smart-glass z-30 shrink-0 transition-all duration-500 opacity-60 hover:opacity-100 hover:text-red-500 active:scale-90"
          >
            <LogOut size={18}/>
          </button>
        </div>
      </div>
    </header>
  );
}
