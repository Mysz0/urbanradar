import React from 'react';
import { Calendar, Leaf, Snowflake, Waves, Flower, Shell, Fish, Lock, Sparkles } from 'lucide-react';

export default function ProfileTab({ 
  tempUsername = "", 
  setTempUsername = () => {}, 
  saveUsername = () => {}, 
  showEmail = false, 
  toggleEmailVisibility = () => {}, 
  isDark = false,
  lastChange = null,
  user = null,
  appStyle = 'emerald',
  setAppStyle = () => {},
  showToast = () => {},
  visitData = { streak: 0 }
}) {
  const provider = user?.app_metadata?.provider || 'account';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const streak = visitData?.streak || 0;
  const isSupernovaLocked = streak < 50;

  const handleSaveIdentity = () => {
    const currentUsername = user?.username || "";
    if (tempUsername.trim() === currentUsername.trim()) {
      showToast("This is already your current identity!", "error");
      return;
    }
    saveUsername();
  };

  const getCooldownInfo = () => {
    if (!lastChange) return null;
    const last = new Date(lastChange).getTime();
    const daysPassed = (new Date().getTime() - last) / (1000 * 60 * 60 * 24);
    if (daysPassed >= 7) return null;
    return Math.ceil(7 - daysPassed);
  };

  const daysLeft = getCooldownInfo();

  return (
    <div className="smart-glass p-10 rounded-[3rem] border space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* IDENTITY SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-end ml-1">
          <label className="text-[10px] font-bold text-[rgb(var(--theme-primary))] uppercase tracking-widest">Identity</label>
          {daysLeft && (
            <span className="text-[9px] font-bold opacity-40 uppercase flex items-center gap-1">
              <Calendar size={10} /> Lock: {daysLeft}d
            </span>
          )}
        </div>
        
        <input 
          type="text" 
          value={tempUsername} 
          onChange={(e) => setTempUsername(e.target.value)}
          className="w-full smart-glass border rounded-2xl py-5 px-6 font-bold outline-none focus:border-[rgb(var(--theme-primary))] transition-all text-sm"
          placeholder="Your callsign..."
        />
        
        <button 
          onClick={handleSaveIdentity}
          disabled={!!daysLeft}
          className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
            daysLeft 
            ? 'opacity-20 cursor-not-allowed grayscale' 
            : 'bg-[rgb(var(--theme-primary))] text-white shadow-lg shadow-[var(--theme-primary-glow)] active:scale-95'
          }`}
        >
          {daysLeft ? 'Identity Locked' : 'Update Identity'}
        </button>
      </div>

      <div className="h-[1px] w-full bg-current opacity-5" />

      {/* VISUAL INTERFACE (THEME SWITCHER) */}
      <div className="space-y-4 px-1">
        <div className="space-y-0.5">
          <p className="text-xs font-bold uppercase tracking-tight">Visual Interface</p>
          <p className="text-[10px] opacity-40">Select your HUD aesthetic</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1.5 smart-glass border rounded-2xl">
          <button 
            onClick={() => setAppStyle('emerald')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'emerald' ? 'bg-emerald-500 text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Leaf size={14} />
            <span className="text-[10px] font-bold uppercase">Emerald</span>
          </button>

          <button 
            onClick={() => setAppStyle('winter')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'winter' ? 'bg-blue-400 text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Snowflake size={14} />
            <span className="text-[10px] font-bold uppercase">Winter</span>
          </button>

          <button 
            onClick={() => setAppStyle('koi')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'koi' ? 'bg-[#EA4426] text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Waves size={14} />
            <span className="text-[10px] font-bold uppercase">Koi</span>
          </button>

          <button 
            onClick={() => setAppStyle('sakura')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'sakura' ? 'bg-[#F4ACB7] text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Flower size={14} />
            <span className="text-[10px] font-bold uppercase">Sakura</span>
          </button>

          <button 
            onClick={() => setAppStyle('salmon')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'salmon' ? 'bg-[#FF8C73] text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Fish size={14} />
            <span className="text-[10px] font-bold uppercase">Salmon</span>
          </button>

          <button 
            onClick={() => setAppStyle('abyss')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              appStyle === 'abyss' ? 'bg-[#FB923C] text-white shadow-lg' : 'opacity-40 hover:opacity-100'
            }`}
          >
            <Shell size={14} />
            <span className="text-[10px] font-bold uppercase">Abyss</span>
          </button>

          {/* NEW LOCKED THEME: SUPERNOVA */}
          <button 
            onClick={() => {
              if (isSupernovaLocked) {
                showToast(`Unlocks at 50 day streak! (${streak}/50)`, "error");
              } else {
                setAppStyle('supernova');
              }
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all relative overflow-hidden ${
              appStyle === 'supernova' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : isSupernovaLocked 
                ? 'bg-current/5 opacity-40 cursor-not-allowed' 
                : 'opacity-40 hover:opacity-100'
            }`}
          >
            {isSupernovaLocked ? <Lock size={12} /> : <Sparkles size={14} />}
            <span className="text-[10px] font-bold uppercase">Supernova</span>
          </button>
        </div>
      </div>

      {/* EMAIL TOGGLE */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <p className="text-xs font-bold uppercase tracking-tight">Display Email</p>
          <p className="text-[10px] opacity-40">Show contact in header</p>
        </div>
        
        <button 
          onClick={toggleEmailVisibility}
          className={`w-12 h-6 rounded-full transition-all relative ${showEmail ? 'bg-[rgb(var(--theme-primary))]' : 'bg-current/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${showEmail ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
}

