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

  // --- PALETTE WITH FROSTED GREEN TINT ---
  const colors = {
    bg: isDark ? 'bg-zinc-950' : 'bg-[#f4f7f5]',
    card: isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-emerald-100 shadow-emerald-900/5',
    // Frosted Header: Uses translucent emerald over the base Zinc or White
    header: isDark 
      ? 'from-emerald-900/10 via-zinc-900/90 to-zinc-950 border-emerald-500/10' 
      : 'from-emerald-500/90 to-emerald-600 border-emerald-400',
    text: isDark ? 'text-zinc-100' : 'text-slate-900',
    muted: isDark ? 'text-zinc-500' : 'text-emerald-700/50',
    nav: isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-emerald-200',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-10 h-10 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
      <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <MapPin size={40} className="text-white" />
      </div>
      <h1 className={`text-5xl font-black mb-10 italic uppercase ${colors.text}`}>SPOT<span className="text-emerald-500">HUNT</span></h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg">
        LOGIN
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      
      {/* FROSTED HEADER */}
      <header className={`bg-gradient-to-b ${colors.header} backdrop-blur-md p-10 pt-16 pb-24 rounded-b-[3rem] border-b shadow-2xl relative overflow-hidden`}>
        {/* Subtlest green glow in top corner */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
        
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-tighter ${isDark ? 'text-emerald-500' : 'text-white'}`}>
              @{username || 'HUNTER'} {isAdmin && "👑"}
            </h1>
            <p className={`${isDark ? 'text-zinc-500' : 'text-emerald-100/80'} text-[10px] font-mono font-bold tracking-widest mt-1`}>
              {user.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-emerald-400 hover:border-emerald-500/50' : 'bg-white/20 border-white/30 text-white'}`}>
              {isDark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={handleLogout} className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-red-400' : 'bg-white/20 border-white/30 text-white'}`}>
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-12 relative z-20">
        
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className={`${colors.card} rounded-[2.5rem] p-8 shadow-xl border flex justify-between items-center`}>
              <div>
                <p className="text-5xl font-black tracking-tighter leading-none">{totalPoints}</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-2">XP Score</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black leading-none">{unlockedSpots.length}</p>
                <p className={`${colors.muted} text-[10px] font-black uppercase mt-1`}>Found</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 px-2 opacity-70">Inventory</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`${colors.card} p-5 rounded-[2rem] flex items-center justify-between border shadow-sm group hover:scale-[1.01] transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black">✓</div>
                    <div>
                      <p className="font-black text-sm uppercase tracking-tight">{spots[id]?.name}</p>
                      <p className="text-[10px] text-emerald-500 font-bold">+{spots[id]?.points} XP</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[2.5rem] p-2 shadow-2xl border h-[480px] overflow-hidden`}>
            {/* Attribution control: false removes the link/logo in the corner */}
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} attributionControl={false} className="h-full w-full rounded-[1.8rem]">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]}>
                  <Popup><span className="font-black uppercase text-xs">{spot.name}</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className={`${colors.card} p-10 rounded-[2.5rem] shadow-xl border space-y-6`}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Callsign</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-emerald-50/50 border-emerald-100'} border-2 rounded-2xl py-4 px-6 font-black outline-none focus:border-emerald-500 transition-all text-sm`}
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest">Update Profile</button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${isDark ? 'bg-zinc-900/50' : 'bg-emerald-50'} backdrop-blur-sm p-8 rounded-[2.5rem] border-2 ${isDark ? 'border-emerald-500/20' : 'border-emerald-200'} text-white space-y-6 shadow-xl`}>
              <h2 className={`font-black uppercase italic flex items-center gap-2 tracking-widest ${isDark ? 'text-emerald-500' : 'text-emerald-800'}`}>
                <Terminal size={18}/> SYSTEM_ADMIN
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-zinc-950/50' : 'bg-white/80 border-emerald-100'} p-4 rounded-3xl border flex justify-between items-center`}>
                      <span className={`text-xs font-black uppercase tracking-tighter ${!isDark && 'text-emerald-950'}`}>{spot.name}</span>
                      <div className="flex gap-2">
                        {isClaimed ? (
                          <button onClick={() => removeSpot(spot.id)} className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"><Trash2 size={14}/></button>
                        ) : (
                          <button onClick={() => claimSpot(spot.id)} className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><Zap size={14}/></button>
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
      <nav className={`fixed bottom-8 left-8 right-8 ${colors.nav} backdrop-blur-md rounded-[2rem] p-1.5 shadow-2xl z-[9999] flex justify-around items-center border transition-all`}>
        {['home', 'explore', 'profile', 'dev'].map((tab) => (
          (tab !== 'dev' || isAdmin) && (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              className={`p-3.5 px-6 rounded-[1.5rem] transition-all relative ${activeTab === tab ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : colors.muted + ' hover:text-emerald-500'}`}>
              {tab === 'home' && <Home size={20}/>}
              {tab === 'explore' && <Compass size={20}/>}
              {tab === 'profile' && <User size={20}/>}
              {tab === 'dev' && <Terminal size={20}/>}
            </button>
          )
        ))}
      </nav>
    </div>
  );
}
