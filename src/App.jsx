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
    if (!error) { setUsername(cleaned); alert("Identity Updated."); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  // --- PROFESSIONAL THEME OBJECT ---
  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f8fafc]',
    card: isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm',
    header: isDark 
      ? 'from-emerald-950/20 via-zinc-900 to-zinc-950 border-zinc-800/50' 
      : 'from-emerald-600 via-emerald-500 to-emerald-600 border-emerald-400',
    text: isDark ? 'text-zinc-100' : 'text-slate-900',
    muted: isDark ? 'text-zinc-500' : 'text-slate-400',
    nav: isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-slate-200 shadow-lg',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 font-sans antialiased transition-colors duration-500`}>
      <style>{`.leaflet-control-attribution { display: none !important; }`}</style>
      
      {/* PROFESSIONAL FROSTED HEADER */}
      <header className={`bg-gradient-to-br ${colors.header} backdrop-blur-xl p-8 pt-14 pb-20 rounded-b-[2.5rem] border-b relative overflow-hidden`}>
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-emerald-500' : 'text-white'}`}>
              @{username || 'HUNTER'} {isAdmin && "👑"}
            </h1>
            <p className={`${isDark ? 'text-zinc-500' : 'text-emerald-50/70'} text-[10px] font-mono font-bold tracking-widest mt-0.5`}>
              {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-zinc-950/50 border-zinc-800 text-emerald-500' : 'bg-white/20 border-white/30 text-white'}`}>
              {isDark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={handleLogout} className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:text-red-400' : 'bg-white/20 border-white/30 text-white'}`}>
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-10 relative z-20">
        
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className={`${colors.card} rounded-[2rem] p-7 flex justify-between items-center border`}>
              <div>
                <p className="text-4xl font-black tracking-tighter leading-none">{totalPoints}</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1.5">Total XP</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black leading-none">{unlockedSpots.length}</p>
                <p className={`${colors.muted} text-[9px] font-bold uppercase mt-1`}>Spots</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70 px-1">Inventory</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`${colors.card} p-4 rounded-2xl flex items-center justify-between border hover:scale-[1.01] transition-transform cursor-default`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black shadow-md shadow-emerald-500/20">✓</div>
                    <div>
                      <p className="font-black text-xs uppercase tracking-tight">{spots[id]?.name}</p>
                      <p className="text-[9px] text-emerald-500 font-bold">LOGGED_ENTRY</p>
                    </div>
                  </div>
                  <div className="text-right px-2">
                    <p className="text-xs font-black">{spots[id]?.points}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[2rem] p-1.5 shadow-2xl border h-[460px] overflow-hidden`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} attributionControl={false} className="h-full w-full rounded-[1.6rem]">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]}>
                  <Popup><span className="font-black uppercase text-[10px]">{spot.name}</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className={`${colors.card} p-8 rounded-[2rem] border space-y-5`}>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Hunter Name</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'} border rounded-xl py-3.5 px-5 font-bold outline-none focus:border-emerald-500 transition-all text-sm`}
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs tracking-widest uppercase">Save ID</button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${isDark ? 'bg-zinc-900' : 'bg-slate-100'} p-7 rounded-[2rem] border-2 ${isDark ? 'border-emerald-500/20' : 'border-emerald-200'} space-y-5 shadow-xl`}>
              <h2 className={`font-black uppercase italic flex items-center gap-2 tracking-widest text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-800'}`}>
                <Terminal size={14}/> DB_CONSOLE
              </h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'} p-3.5 rounded-xl border flex justify-between items-center`}>
                      <span className={`text-[10px] font-black uppercase ${!isDark && 'text-slate-700'}`}>{spot.name}</span>
                      <div className="flex gap-2">
                        {isClaimed ? (
                          <button onClick={() => removeSpot(spot.id)} className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                        ) : (
                          <button onClick={() => claimSpot(spot.id)} className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Zap size={14}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </div>

      {/* FULL WIDTH SLIM NAV BAR */}
      <nav className={`fixed bottom-8 left-8 right-8 ${colors.nav} backdrop-blur-md rounded-2xl p-1.5 z-[9999] flex justify-around items-center border transition-all`}>
        {['home', 'explore', 'profile', 'dev'].map((tab) => (
          (tab !== 'dev' || isAdmin) && (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`p-3 px-6 rounded-xl transition-all relative ${activeTab === tab ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : colors.muted + ' hover:text-emerald-500'}`}>
              {tab === 'home' && <Home size={18}/>}
              {tab === 'explore' && <Compass size={18}/>}
              {tab === 'profile' && <User size={18}/>}
              {tab === 'dev' && <Terminal size={18}/>}
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
