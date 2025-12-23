import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Trophy, User, Home, Compass, LogOut, Terminal, Zap, Trash2, Sun, Moon, Radar } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabase'; 

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

// --- UTILS ---
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in meters
};

const sleekIcon = (isDark) => L.divIcon({
  className: 'custom-marker',
  html: `
    <div class="marker-container">
      <div class="pulse-ring"></div>
      <div class="marker-core" style="border-color: ${isDark ? '#09090b' : '#fff'};"></div>
    </div>
    <style>
      .marker-container { position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; }
      .pulse-ring { position: absolute; width: 100%; height: 100%; background: rgba(16, 185, 129, 0.4); border-radius: 50%; animation: marker-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }
      .marker-core { position: relative; width: 10px; height: 10px; background: #10b981; border: 2px solid; border-radius: 50%; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); z-index: 2; }
      @keyframes marker-pulse { 0% { transform: scale(0.6); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [userCoords, setUserCoords] = useState(null);
  const [nearbySpot, setNearbySpot] = useState(null);

  const isAdmin = user?.id === ADMIN_UID;
  const isDark = theme === 'dark';
  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  // Watch Position for Nearby Detection
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watcher = navigator.geolocation.watchPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, []);

  // Check Proximity
  useEffect(() => {
    if (!userCoords || Object.keys(spots).length === 0) return;
    const nearby = Object.values(spots).find(spot => {
      if (unlockedSpots.includes(spot.id)) return false;
      const dist = getDistance(userCoords.lat, userCoords.lng, spot.lat, spot.lng);
      return dist < 500; // 500 meters
    });
    setNearbySpot(nearby ? nearby.name : null);
  }, [userCoords, spots, unlockedSpots]);

  useEffect(() => {
    const initApp = async () => {
      const { data: dbSpots } = await supabase.from('spots').select('*');
      if (dbSpots) setSpots(dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}));
      
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
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f0f4f2]',
    card: isDark ? 'bg-zinc-900/40 border-white/[0.03] shadow-2xl' : 'bg-white/70 border-emerald-200/50 shadow-md shadow-emerald-900/5',
    nav: isDark ? 'bg-zinc-900/80 border-white/[0.05]' : 'bg-white/95 border-emerald-200/60',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
    glass: isDark ? 'bg-white/[0.02] backdrop-blur-xl border-white/[0.05]' : 'bg-white/40 backdrop-blur-xl border-white/20'
  };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500 selection:bg-emerald-500/30`}>
      {/* THEME TOGGLE */}
      <button 
        ref={themeMag.ref} onMouseMove={themeMag.handleMouseMove} onMouseLeave={themeMag.reset}
        style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
        onClick={toggleTheme} 
        className={`fixed top-6 right-6 p-3.5 rounded-2xl border transition-all duration-300 ease-out active:scale-90 z-[10000] ${isDark ? 'bg-zinc-900/80 border-white/10 text-emerald-400' : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg backdrop-blur-md'}`}
      >
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <style>{`
        .leaflet-control-attribution { display: none !important; }
        .leaflet-container { background: ${isDark ? '#09090b' : '#f0f4f2'} !important; }
      `}</style>

      <header className="relative pt-16 pb-32 px-10 rounded-b-[4.5rem] border-b border-white/[0.05] overflow-hidden">
        <div className={`absolute inset-0 ${isDark ? 'bg-zinc-950/40' : 'bg-white/10'} backdrop-blur-3xl z-10`} />
        <div className="max-w-md mx-auto flex justify-between items-center relative z-20">
          <h1 className="text-3xl font-bold tracking-tighter italic uppercase">{username || 'Hunter'}<span className="text-emerald-500">.</span></h1>
          <button onClick={handleLogout} className="p-3.5 rounded-2xl border bg-white/5 border-white/10 text-zinc-500"><LogOut size={18}/></button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* PROXIMITY ALERT */}
            {nearbySpot && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[2rem] flex items-center gap-3 animate-pulse">
                <Radar size={18} className="text-emerald-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Signal Detected: {nearbySpot} is nearby</p>
              </div>
            )}

            <div className={`${colors.card} backdrop-blur-2xl rounded-[3rem] p-10 border flex justify-between items-center`}>
              <div>
                <p className="text-6xl font-bold tracking-tighter leading-none">{unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0)}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-4">Experience</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50 px-4">Collections</h2>
              {unlockedSpots.map(id => (
                <div key={id} className={`group relative ${colors.card} p-5 rounded-[2.2rem] flex items-center justify-between border transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 cursor-pointer overflow-hidden`}>
                  {/* ANIMATED HOVER BORDER EFFECT */}
                  <div className="absolute inset-0 border-2 border-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.2rem] pointer-events-none" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">✓</div>
                    <div>
                      <p className="font-bold text-sm tracking-tight">{spots[id]?.name}</p>
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Found</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold opacity-30 group-hover:opacity-100 group-hover:text-emerald-500 transition-all duration-300">+{spots[id]?.points}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${colors.card} rounded-[3rem] p-2 shadow-2xl border h-[520px] overflow-hidden`}>
            <MapContainer 
              key={`map-${theme}`}
              center={[40.730610, -73.935242]} 
              zoom={12} 
              zoomControl={false} 
              className="h-full w-full rounded-[2.5rem]"
              whenReady={(m) => setTimeout(() => m.target.invalidateSize(), 200)}
            >
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={sleekIcon(isDark)}>
                  <Popup><span className="font-bold text-xs">{spot.name}</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      <nav className="fixed bottom-10 left-8 right-8 z-[9999] flex justify-center">
        <div className={`${colors.nav} backdrop-blur-3xl rounded-[2.5rem] p-1.5 flex items-center border shadow-2xl shadow-black/10`}>
          {['home', 'explore', 'profile', 'dev'].map((tab) => (
            (tab !== 'dev' || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab)} 
                className={`p-4 px-7 rounded-[2rem] transition-all duration-500 relative ${activeTab === tab ? 'bg-emerald-500/10 text-emerald-500 scale-110' : 'text-zinc-500'}`}>
                {tab === 'home' && <Home size={22}/>}
                {tab === 'explore' && <Compass size={22}/>}
                {tab === 'profile' && <User size={22}/>}
                {tab === 'dev' && <Terminal size={22}/>}
              </button>
            )
          ))}
        </div>
      </nav>
    </div>
  );
}
