import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Trophy, User, Home, Compass, LogOut, Terminal, Zap, Trash2, Sun, Moon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabase'; 

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

// --- CUSTOM SLEEK MARKER (Pulsing Core) ---
const sleekIcon = (isDark) => L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; background: rgba(16, 185, 129, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>
      <div style="width: 10px; height: 10px; background: #10b981; border: 2px solid ${isDark ? '#09090b' : '#fff'}; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);"></div>
    </div>
    <style>
      @keyframes pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const useMagnetic = () => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.35;
    const y = (clientY - (top + height / 2)) * 0.35;
    setPosition({ x, y });
  };
  const reset = () => setPosition({ x: 0, y: 0 });
  return { ref, position, handleMouseMove, reset };
};

export default function App() {
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [mapCenter] = useState([40.730610, -73.935242]);

  const isAdmin = user?.id === ADMIN_UID;
  const isDark = theme === 'dark';

  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  useEffect(() => {
    const initApp = async () => {
      const { data: dbSpots } = await supabase.from('spots').select('*');
      if (dbSpots) {
        const spotsObj = dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
        setSpots(spotsObj);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          setUnlockedSpots(data.unlocked_spots || []);
          setUsername(data.username || '');
          setTempUsername(data.username || '');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const claimSpot = async (spotId) => {
    const newUnlocked = [...unlockedSpots, spotId];
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
    if (!error) setUnlockedSpots(newUnlocked);
  };

  const removeSpot = async (spotId) => {
    const newUnlocked = unlockedSpots.filter(id => id !== spotId);
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
    if (!error) setUnlockedSpots(newUnlocked);
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.replace('@', '').trim();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: cleaned });
    if (!error) { setUsername(cleaned); alert("Profile secured."); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f8faf9]',
    card: isDark ? 'bg-zinc-900/40 border-white/[0.03] shadow-2xl' : 'bg-white border-emerald-100/30 shadow-sm',
    nav: isDark ? 'bg-zinc-900/80 border-white/[0.05]' : 'bg-white/90 border-emerald-100/50',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
        <MapPin size={32} className="text-white" />
      </div>
      <h1 className={`text-3xl font-bold mb-8 tracking-tight ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
        Sign in with GitHub
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      {/* GLOBAL OVERRIDES (for Apple logo & Attribution) */}
      <style>{`
        .leaflet-control-attribution, .leaflet-control-container img[src*="apple"], img[src*="apple-logo"] { display: none !important; }
        .header-glow {
          background: radial-gradient(circle at top, ${isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'} 0%, transparent 70%);
        }
      `}</style>

      {/* NEW LAYERED HEADER */}
      <header className="relative pt-16 pb-32 px-10 rounded-b-[4rem] border-b border-white/[0.05] overflow-hidden">
        <div className="absolute inset-0 header-glow z-0" />
        <div className={`absolute inset-0 ${isDark ? 'bg-zinc-950/40' : 'bg-white/10'} backdrop-blur-3xl z-0`} />
        
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
               {isAdmin && <span className="text-[7px] font-black tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">ADMIN ACCESS</span>}
               {!isAdmin && <span className="text-[7px] font-black tracking-[0.2em] text-zinc-500">EXPLORER</span>}
            </div>
            <h1 className="text-3xl font-bold tracking-tighter italic uppercase">
              {username || 'Hunter'}<span className="text-emerald-500 font-normal">.</span>
            </h1>
          </div>
          
          <div className="flex gap-2.5">
            <button 
              ref={themeMag.ref} onMouseMove={themeMag.handleMouseMove} onMouseLeave={themeMag.reset}
              style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
              onClick={toggleTheme} 
              className={`p-3.5 rounded-2xl border transition-all duration-300 ease-out active:scale-90 ${isDark ? 'bg-white/[0.03] border-white/[0.05] text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600 shadow-sm'}`}
            >
              {isDark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>

            <button 
              ref={logoutMag.ref} onMouseMove={logoutMag.handleMouseMove} onMouseLeave={logoutMag.reset}
              style={{ transform: `translate(${logoutMag.position.x}px, ${logoutMag.position.y}px)` }}
              onClick={handleLogout} 
              className={`p-3.5 rounded-2xl border transition-all duration-300 ease-out active:scale-90 ${isDark ? 'bg-white/[0.03] border-white/[0.05] text-zinc-500' : 'bg-white border-emerald-100 text-emerald-600 shadow-sm'}`}
            >
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-20">
        
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className={`${colors.card} backdrop-blur-2xl rounded-[3rem] p-10 border flex justify-between items-center`}>
              <div>
                <p className="text-6xl font-bold tracking-tighter leading-none">{totalPoints}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-4">Experience</p>
              </div>
              <div className="h-12 w-px bg-white/5" />
              <div className="text-right">
                <p className="text-3xl font-bold leading-none">{unlockedSpots.length}</p>
                <p className="text-zinc-500 text-[10px] font-bold uppercase mt-1">Found</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50 px-4">Collections</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border group transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center font-bold">✓</div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spots[id]?.name}</p>
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Confirmed</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold opacity-30">+{spots[id]?.points}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[3rem] p-2 shadow-2xl border h-[520px] overflow-hidden`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} zoomControl={false} className="h-full w-full rounded-[2.5rem] z-0">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={sleekIcon(isDark)}>
                  <Popup><span className="font-bold text-xs">{spot.name}</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className={`${colors.card} p-10 rounded-[3rem] border space-y-8`}>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Identity</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-black/40 border-white/[0.05]' : 'bg-emerald-50/30 border-emerald-100'} border rounded-2xl py-5 px-6 font-bold outline-none focus:border-emerald-500/40 transition-all text-sm`}
                  placeholder="Your callsign..."
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all text-sm">
                Apply Changes
              </button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${colors.card} p-8 rounded-[3rem] border space-y-6`}>
              <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-widest text-emerald-500">
                <Terminal size={14}/> Node Override
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'} p-4 rounded-[1.8rem] flex justify-between items-center`}>
                      <span className="text-xs font-bold tracking-tight">{spot.name}</span>
                      <div className="flex gap-2">
                        {isClaimed ? (
                          <button onClick={() => removeSpot(spot.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
                        ) : (
                          <button onClick={() => claimSpot(spot.id)} className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"><Zap size={16}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </div>

      <nav className="fixed bottom-10 left-8 right-8 z-[9999] flex justify-center">
        <div className={`${colors.nav} backdrop-blur-3xl rounded-[2.5rem] p-1.5 flex items-center border shadow-[0_20px_50px_rgba(0,0,0,0.2)]`}>
          {['home', 'explore', 'profile', 'dev'].map((tab) => (
            (tab !== 'dev' || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab)} 
                className={`p-4 px-7 rounded-[2rem] transition-all duration-500 relative ${activeTab === tab ? 'bg-emerald-500/10 text-emerald-500 scale-110' : 'text-zinc-500 hover:text-emerald-500/40'}`}>
                {tab === 'home' && <Home size={22} strokeWidth={activeTab === tab ? 2.5 : 2}/>}
                {tab === 'explore' && <Compass size={22} strokeWidth={activeTab === tab ? 2.5 : 2}/>}
                {tab === 'profile' && <User size={22} strokeWidth={activeTab === tab ? 2.5 : 2}/>}
                {tab === 'dev' && <Terminal size={22} strokeWidth={activeTab === tab ? 2.5 : 2}/>}
              </button>
            )
          ))}
        </div>
      </nav>
    </div>
  );
}
