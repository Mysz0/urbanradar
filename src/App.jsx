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

  // FIXED LOGOUT: Await the signout before redirecting
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = '/';
    }
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

  // --- REFINED PALETTE (Restored Dark + Enhanced Light) ---
  const colors = {
    bg: isDark ? 'bg-zinc-950' : 'bg-[#f0f9f6]', // Light mode gets a very soft mint tint
    card: isDark ? 'bg-zinc-900 border-zinc-800 shadow-black' : 'bg-white border-emerald-100 shadow-emerald-200/50',
    header: isDark ? 'from-zinc-900 to-zinc-950 border-emerald-500/10' : 'from-emerald-500 to-emerald-600 border-emerald-400',
    text: isDark ? 'text-zinc-100' : 'text-slate-900',
    muted: isDark ? 'text-zinc-500' : 'text-emerald-600/60',
    nav: isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-emerald-200',
    adminPanel: isDark ? 'bg-zinc-900 border-emerald-500/30' : 'bg-emerald-100 border-emerald-300',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
      <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
        <MapPin size={40} className="text-white" />
      </div>
      <h1 className={`text-5xl font-black mb-8 italic tracking-tighter uppercase ${colors.text}`}>SPOT<span className="text-emerald-500">HUNT</span></h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all">
        LOGIN
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-32 font-sans transition-colors duration-500`}>
      
      {/* HEADER */}
      <header className={`bg-gradient-to-b ${colors.header} p-8 pt-12 pb-20 rounded-b-[2.5rem] border-b shadow-lg relative`}>
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-emerald-400' : 'text-white'}`}>
              @{username || 'HUNTER'} {isAdmin && "👑"}
            </h1>
            <p className={`${isDark ? 'text-zinc-500' : 'text-emerald-100/70'} text-[10px] font-mono font-bold mt-0.5`}>
              {user.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-emerald-400' : 'bg-white/20 border-white/30 text-white'}`}>
              {isDark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={handleLogout} className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-white/20 border-white/30 text-white'}`}>
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-10 relative z-20">
        
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className={`${colors.card} rounded-[2rem] p-6 shadow-xl border flex justify-between items-center transition-all`}>
              <div>
                <p className="text-5xl font-black tracking-tighter">{totalPoints}</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">XP Score</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black leading-none">{unlockedSpots.length}</p>
                <p className={`${colors.muted} text-[9px] font-black uppercase mt-1`}>Found</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 px-1 opacity-70">Inventory</h2>
              {unlockedSpots.length === 0 ? (
                <div className={`${colors.card} rounded-[1.5rem] p-10 text-center border-2 border-dashed border-emerald-500/20`}>
                  <p className={`${colors.muted} font-bold text-[10px] uppercase`}>Empty</p>
                </div>
              ) : (
                unlockedSpots.map(id => (
                  <div key={id} className={`${colors.card} p-4 rounded-2xl flex items-center justify-between border shadow-sm`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black">✓</div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-tight">{spots[id]?.name}</p>
                        <p className="text-[9px] text-emerald-500 font-bold">+{spots[id]?.points} XP</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[2rem] p-2 shadow-2xl border h-[420px] overflow-hidden`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} className="h-full w-full rounded-[1.6rem]">
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
           <div className={`${colors.card} p-8 rounded-[2rem] shadow-xl border space-y-4`}>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Identity</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-emerald-50/50 border-emerald-200'} border-2 rounded-xl py-3 px-4 font-black outline-none focus:border-emerald-500 transition-all text-sm`}
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-500/20 text-sm">SAVE</button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${colors.adminPanel} p-6 rounded-[2rem] border-2 space-y-5 shadow-xl`}>
              <h2 className={`font-black uppercase italic flex items-center gap-2 text-xs tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <Terminal size={16}/> SYSTEM_ADMIN
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-zinc-950/40' : 'bg-white/80'} p-3 rounded-xl border ${isDark ? 'border-white/5' : 'border-emerald-200'} flex justify-between items-center`}>
                      <span className={`text-[10px] font-black uppercase ${isDark ? 'text-zinc-300' : 'text-emerald-900'}`}>{spot.name}</span>
                      <div className="flex gap-1">
                        {isClaimed ? (
                          <button onClick={() => removeSpot(spot.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"><Trash2 size={12}/></button>
                        ) : (
                          <button onClick={() => claimSpot(spot.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"><Zap size={12}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </div>

      {/* SLIM CENTERED NAV BAR */}
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[80%] max-w-[280px] ${colors.nav} backdrop-blur-md rounded-2xl p-1 shadow-2xl z-[9999] flex justify-between items-center border transition-all`}>
        {['home', 'explore', 'profile', 'dev'].map((tab) => (
          (tab !== 'dev' || isAdmin) && (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`p-2.5 px-3.5 rounded-xl transition-all relative ${activeTab === tab ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : colors.muted + ' hover:text-emerald-500'}`}>
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
