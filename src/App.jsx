import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Compass, LogOut, Terminal, Zap, Trash2, Sun, Moon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabase'; 

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

// Leaflet fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const claimSpot = async (spotId) => {
    if (unlockedSpots.includes(spotId)) return;
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
    if (!error) { setUsername(cleaned); alert("Profile updated."); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  // --- REFINED SOPHISTICATED PALETTE ---
  const colors = {
    bg: isDark ? 'bg-[#050806]' : 'bg-[#fdfefd]',
    card: isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-emerald-50 shadow-sm',
    text: isDark ? 'text-zinc-100' : 'text-slate-800',
    muted: isDark ? 'text-zinc-500' : 'text-slate-400',
    accent: 'text-emerald-500',
    nav: isDark ? 'bg-[#0f1410]/60 border-white/5' : 'bg-white/70 border-emerald-100/50',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
      <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
        <MapPin size={32} className="text-white" />
      </div>
      <h1 className={`text-4xl font-bold mb-10 tracking-tight ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-semibold shadow-lg hover:bg-emerald-600 transition-all">
        Sign in with GitHub
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500 selection:bg-emerald-500/30`}>
      
      {/* GLASSY GREEN TOP TINT */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none z-0" />
      
      <header className="relative z-10 max-w-md mx-auto px-6 pt-16 pb-12 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-1">Explorer</p>
          <h1 className="text-2xl font-bold tracking-tight">
            @{username || 'Hunter'} {isAdmin && <span className="text-xs align-top ml-1 opacity-50">Admin</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-900 text-zinc-400 border border-white/5' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {isDark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          <button onClick={handleLogout} className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-900 text-zinc-400 border border-white/5' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 relative z-10 space-y-6">
        
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className={`${colors.card} backdrop-blur-md rounded-[2.5rem] p-8 border flex justify-between items-end`}>
              <div>
                <p className={`${colors.muted} text-[10px] font-bold uppercase tracking-widest mb-1`}>Current Score</p>
                <p className="text-5xl font-bold tracking-tighter">{totalPoints}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{unlockedSpots.length}</p>
                <p className={`${colors.muted} text-[10px] font-bold uppercase tracking-widest`}>Locations</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/70 px-2">Discovery Log</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`${colors.card} p-5 rounded-3xl flex items-center justify-between border group transition-all hover:border-emerald-500/30`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{spots[id]?.name}</p>
                      <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-tighter">+{spots[id]?.points} XP</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[2.5rem] p-2 shadow-xl border h-[480px] overflow-hidden animate-in zoom-in-95 duration-500`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} attributionControl={false} className="h-full w-full rounded-[2rem]">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]}>
                  <Popup>
                    <div className="font-bold text-xs p-1">{spot.name}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className={`${colors.card} p-8 rounded-[2.5rem] border space-y-6 animate-in slide-in-from-bottom-4 duration-500`}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Callsign</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-950/50 border-white/5' : 'bg-emerald-50/30 border-emerald-100'} border rounded-2xl py-4 px-6 font-semibold outline-none focus:border-emerald-500/50 transition-all text-sm`}
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 active:scale-[0.98] transition-all text-sm">
                Update Profile
              </button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${colors.card} p-6 rounded-[2.5rem] border space-y-4 animate-in fade-in`}>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 px-2 flex items-center gap-2">
                <Terminal size={14}/> Management
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-white/5' : 'bg-slate-50'} p-4 rounded-2xl flex justify-between items-center`}>
                      <span className="text-xs font-bold">{spot.name}</span>
                      <div className="flex gap-2">
                        {isClaimed ? (
                          <button onClick={() => removeSpot(spot.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
                        ) : (
                          <button onClick={() => claimSpot(spot.id)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"><Zap size={16}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </main>

      {/* REFINED GLASSY NAV BAR */}
      <nav className="fixed bottom-10 left-6 right-6 z-[9999] flex justify-center">
        <div className={`${colors.nav} backdrop-blur-2xl rounded-[2.2rem] p-2 flex items-center border shadow-2xl shadow-black/20`}>
          {['home', 'explore', 'profile', 'dev'].map((tab) => (
            (tab !== 'dev' || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab)} 
                className={`p-4 px-7 rounded-[1.8rem] transition-all duration-300 relative ${activeTab === tab ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:text-emerald-500/70'}`}>
                {tab === 'home' && <Home size={22} strokeWidth={2.5}/>}
                {tab === 'explore' && <Compass size={22} strokeWidth={2.5}/>}
                {tab === 'profile' && <User size={22} strokeWidth={2.5}/>}
                {tab === 'dev' && <Terminal size={22} strokeWidth={2.5}/>}
              </button>
            )
          ))}
        </div>
      </nav>
    </div>
  );
}
