import React, { useState, useEffect, useRef } from 'react';
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

// Custom Magnetic Hook for the "Real" feel
const useMagnetic = () => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.35; // Sensitivity
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

  // Magnetic Button States
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

  const colors = {
    bg: isDark ? 'bg-zinc-950' : 'bg-[#f7faf8]',
    card: isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-emerald-100/40 shadow-sm',
    header: isDark 
      ? 'from-emerald-950/30 via-zinc-900/90 to-zinc-950 border-emerald-500/10' 
      : 'from-emerald-100/60 via-emerald-50/40 to-[#f7faf8] border-emerald-200/20',
    text: isDark ? 'text-zinc-100' : 'text-slate-900',
    muted: isDark ? 'text-zinc-500' : 'text-emerald-800/40',
    nav: isDark ? 'bg-zinc-900/60 border-white/5' : 'bg-white/80 border-emerald-100/60',
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
      <div className="w-20 h-20 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
        <MapPin size={40} className="text-white" />
      </div>
      <h1 className={`text-4xl font-bold mb-10 tracking-tight ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-600 transition-all">
        Sign in with GitHub
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      
      {/* DEEP CURVED HEADER */}
      <header className={`bg-gradient-to-b ${colors.header} backdrop-blur-2xl p-10 pt-16 pb-32 rounded-b-[4.5rem] border-b relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/[0.03] pointer-events-none" />
        
        <div className="max-w-md mx-auto flex justify-between items-center relative z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-500 mb-1 opacity-90">Current Explorer</p>
            <h1 className="text-2xl font-bold tracking-tight">
              @{username || 'Hunter'} {isAdmin && <span className="text-emerald-500">★</span>}
            </h1>
          </div>
          
          <div className="flex gap-3">
            {/* MAGNETIC THEME BUTTON */}
            <button 
              ref={themeMag.ref}
              onMouseMove={themeMag.handleMouseMove}
              onMouseLeave={themeMag.reset}
              style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
              onClick={toggleTheme} 
              className={`p-3.5 rounded-2xl border transition-all duration-200 ease-out active:scale-90 ${isDark ? 'bg-zinc-800/40 border-zinc-700 text-emerald-400' : 'bg-white border-emerald-100 text-emerald-600 shadow-sm'}`}
            >
              {isDark ? <Sun size={20}/> : <Moon size={20}/>}
            </button>

            {/* MAGNETIC LOGOUT BUTTON */}
            <button 
              ref={logoutMag.ref}
              onMouseMove={logoutMag.handleMouseMove}
              onMouseLeave={logoutMag.reset}
              style={{ transform: `translate(${logoutMag.position.x}px, ${logoutMag.position.y}px)` }}
              onClick={handleLogout} 
              className={`p-3.5 rounded-2xl border transition-all duration-200 ease-out active:scale-90 ${isDark ? 'bg-zinc-800/40 border-zinc-700 text-zinc-500' : 'bg-white border-emerald-100 text-emerald-600 shadow-sm'}`}
            >
              <LogOut size={20}/>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-20">
        
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className={`${colors.card} backdrop-blur-xl rounded-[2.8rem] p-9 border flex justify-between items-center`}>
              <div>
                <p className="text-5xl font-bold tracking-tighter leading-none">{totalPoints}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-4">Experience</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold leading-none">{unlockedSpots.length}</p>
                <p className={`${colors.muted} text-[10px] font-bold uppercase mt-1`}>Discoveries</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500/60 px-4">Journey Log</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border transition-all hover:border-emerald-500/20`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-[1.2rem] flex items-center justify-center">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spots[id]?.name}</p>
                      <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">Confirmed Discovery</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold bg-emerald-500/5 px-3 py-1.5 rounded-full text-emerald-500">
                    +{spots[id]?.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[3rem] p-2 shadow-2xl border h-[500px] overflow-hidden`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} attributionControl={false} className="h-full w-full rounded-[2.4rem]">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]}>
                  <Popup><span className="font-bold text-xs">{spot.name}</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
           <div className={`${colors.card} p-10 rounded-[2.8rem] border space-y-8`}>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Callsign</label>
                <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-950/50 border-white/5' : 'bg-emerald-50/30 border-emerald-100'} border rounded-2xl py-5 px-6 font-bold outline-none focus:border-emerald-500/40 transition-all text-sm`}
                />
              </div>
              <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-bold shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 active:scale-[0.97] transition-all text-sm">
                Save Profile
              </button>
           </div>
        )}

        {activeTab === 'dev' && isAdmin && (
           <div className={`${colors.card} p-8 rounded-[2.8rem] border space-y-6`}>
              <h2 className="font-bold uppercase flex items-center gap-2 text-[10px] tracking-[0.2em] text-emerald-500">
                <Terminal size={14}/> Node Management
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {Object.values(spots).map(spot => {
                  const isClaimed = unlockedSpots.includes(spot.id);
                  return (
                    <div key={spot.id} className={`${isDark ? 'bg-black/20' : 'bg-slate-50/50'} p-4 rounded-[1.5rem] flex justify-between items-center border border-transparent hover:border-emerald-500/10 transition-all`}>
                      <span className="text-xs font-bold">{spot.name}</span>
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

      {/* REFINED GLASS NAV BAR */}
      <nav className="fixed bottom-10 left-8 right-8 z-[9999] flex justify-center">
        <div className={`${colors.nav} backdrop-blur-2xl rounded-[2.5rem] p-1.5 flex items-center border shadow-2xl shadow-black/10`}>
          {['home', 'explore', 'profile', 'dev'].map((tab) => (
            (tab !== 'dev' || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab)} 
                className={`p-4 px-7 rounded-[2rem] transition-all duration-300 relative ${activeTab === tab ? 'bg-emerald-500/10 text-emerald-500 scale-105' : 'text-zinc-500 hover:text-emerald-500/40'}`}>
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
