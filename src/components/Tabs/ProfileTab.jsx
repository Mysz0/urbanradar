import React from 'react';
import { Calendar, Leaf, Snowflake, Waves, Flower, Shell, Fish, Layers, Lock, Sparkles } from 'lucide-react';

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
  visitData = { streak: 0 },
  unlockedThemes = ['emerald', 'winter'],
  totalPoints = 0,
  buyTheme = () => {}
}) {
  const provider = user?.app_metadata?.provider || 'account';
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const streak = visitData?.streak || 0;
  const isSupernovaLocked = streak < 50;

  const themes = [
    { id: 'emerald', label: 'Emerald', icon: Leaf, color: 'bg-emerald-500', price: 0, free: true },
    { id: 'winter', label: 'Winter', icon: Snowflake, color: 'bg-blue-400', price: 0, free: true },
    { id: 'koi', label: 'Koi', icon: Waves, color: 'bg-[#EA4426]', price: 500 },
    { id: 'sakura', label: 'Sakura', icon: Flower, color: 'bg-[#F4ACB7]', price: 750 },
    { id: 'salmon', label: 'Salmon', icon: Fish, color: 'bg-[#FF8C73]', price: 600 },
    { id: 'abyss', label: 'Abyss', icon: Shell, color: 'bg-[#FB923C]', price: 1000 },
    { id: 'marble', label: 'Marble', icon: Layers, color: 'bg-[#18181b]', price: 800 },
  ];

  const handleThemeClick = (theme) => {
    const isUnlocked = unlockedThemes.includes(theme.id);
    
    if (isUnlocked) {
      setAppStyle(theme.id);
    } else {
      if (totalPoints < theme.price) {
        showToast(`Need ${theme.price}XP (You have ${totalPoints}XP)`, "error");
      } else {
        buyTheme(theme.id, theme.price);
      }
    }
  };

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
          {themes.map((theme) => {
            const isUnlocked = unlockedThemes.includes(theme.id);
            const Icon = theme.icon;
            
            return (
              <button 
                key={theme.id}
                onClick={() => handleThemeClick(theme)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all relative ${
                  appStyle === theme.id 
                  ? `${theme.color} text-white shadow-lg` 
                  : isUnlocked
                    ? 'opacity-40 hover:opacity-100'
                    : 'bg-current/5 opacity-40 hover:opacity-60'
                }`}
              >
                {!isUnlocked && <Lock size={12} className="absolute top-1 right-1 opacity-50" />}
                <Icon size={14} />
                <span className="text-[10px] font-bold uppercase">{theme.label}</span>
                {!isUnlocked && !theme.free && (
                  <span className="absolute bottom-1 text-[8px] font-black opacity-50">{theme.price}XP</span>
                )}
              </button>
            );
          })}

          {/* SUPERNOVA (streak-locked) */}
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

