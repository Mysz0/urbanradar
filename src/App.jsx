import React, { useState, useEffect } from 'react';
import { Sun, Moon, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// MODULAR IMPORTS
import { supabase } from './supabase'; 
import { getDistance } from './utils/geoUtils';
import { useMagnetic } from './hooks/useMagnetic';

// COMPONENT IMPORTS
import Header from './components/Layout/Header';
import Navbar from './components/Layout/Navbar';
import HomeTab from './components/Tabs/HomeTab';
import ExploreTab from './components/Tabs/ExploreTab';
import LeaderboardTab from './components/Tabs/LeaderboardTab';
import ProfileTab from './components/Tabs/ProfileTab';
import AdminTab from './components/Tabs/AdminTab';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function App() {
  // --- STATE ---
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [userLocation, setUserLocation] = useState(null);
  const [isNearSpot, setIsNearSpot] = useState(false);
  const [mapCenter] = useState([40.730610, -73.935242]);
  const [leaderboard, setLeaderboard] = useState([]);

  // --- HELPERS & HOOKS ---
  const isAdmin = user?.id === ADMIN_UID;
  const isDark = theme === 'dark';
  const themeMag = useMagnetic();
  const logoutMag = useMagnetic();

  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f0f4f2]',
    card: isDark ? 'bg-zinc-900/40 border-white/[0.03] shadow-2xl' : 'bg-white/70 border-emerald-200/50 shadow-md shadow-emerald-900/5',
    nav: isDark ? 'bg-zinc-900/80 border-white/[0.05]' : 'bg-white/95 border-emerald-200/60',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
    glass: isDark ? 'bg-white/[0.02] backdrop-blur-xl border-white/[0.05]' : 'bg-white/40 backdrop-blur-xl border-white/20'
  };

  // --- SYSTEM EFFECTS ---
  useEffect(() => {
    const root = window.document.documentElement;
    
    // 1. Tailwind Dark Mode
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Browser System UI (Scrollbars/Forms)
    root.style.colorScheme = theme;

    // 3. Dynamic Meta Theme Color (Safari/Chrome Address Bar & Overscroll)
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeHex = isDark ? '#09090b' : '#f0f4f2';

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeHex);

    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const initApp = async () => {
      const { data: dbSpots } = await supabase.from('spots').select('*');
      if (dbSpots) {
        const spotsObj = dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
        setSpots(spotsObj);
        fetchLeaderboard(spotsObj);
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

    const watchId = navigator.geolocation.watchPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (userLocation && Object.values(spots).length > 0) {
      const nearby = Object.values(spots).some(spot => 
        getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng) < 0.25
      );
      setIsNearSpot(nearby);
    }
  }, [userLocation, spots]);

  // --- ACTIONS ---
  const fetchLeaderboard = async (currentSpots) => {
    const { data: profiles } = await supabase.from('profiles').select('username, unlocked_spots');
    if (profiles) {
      const ranked = profiles.map(p => ({
        username: p.username || 'Anonymous',
        score: (p.unlocked_spots || []).reduce((sum, id) => sum + (currentSpots[id]?.points || 0), 0),
        found: (p.unlocked_spots || []).length
      })).sort((a, b) => b.score - a.score);
      setLeaderboard(ranked);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const saveUsername = async () => {
    const cleaned = tempUsername.replace('@', '').trim();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: cleaned });
    if (!error) { setUsername(cleaned); alert("Profile secured."); fetchLeaderboard(spots); }
  };

  const claimSpot = async (spotId) => {
    const newUnlocked = [...unlockedSpots, spotId];
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
    if (!error) { setUnlockedSpots(newUnlocked); fetchLeaderboard(spots); }
  };

  const removeSpot = async (spotId) => {
    const newUnlocked = unlockedSpots.filter(id => id !== spotId);
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
    if (!error) { setUnlockedSpots(newUnlocked); fetchLeaderboard(spots); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  // --- AUTH & LOADING VIEWS ---
  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center transition-colors duration-500`}>
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6 relative transition-colors duration-500`}>
      <button ref={themeMag.ref} onMouseMove={themeMag.handleMouseMove} onMouseLeave={themeMag.reset}
        style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
        onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
        className={`fixed top-6 right-6 p-3.5 rounded-2xl border transition-all duration-300 ease-out active:scale-90 z-[10000] ${isDark ? 'bg-zinc-900/80 border-white/10 text-emerald-400' : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg backdrop-blur-md'}`}>
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
        <MapPin size={32} className="text-white" />
      </div>

      <h1 className={`text-3xl font-bold mb-8 tracking-tight ${colors.text} transition-colors duration-500`}>
        SpotHunt
      </h1>

      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
        Sign in with GitHub
      </button>
    </div>
  );

  // --- MAIN APP VIEW ---
  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500 selection:bg-emerald-500/30`}>
      
      {/* Universal Theme Toggle */}
      <button ref={themeMag.ref} onMouseMove={themeMag.handleMouseMove} onMouseLeave={themeMag.reset}
        style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        className={`fixed top-6 right-6 p-3.5 rounded-2xl border transition-all duration-300 ease-out active:scale-90 z-[10000] ${isDark ? 'bg-zinc-900/80 border-white/10 text-emerald-400' : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg backdrop-blur-md'}`}
      >
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <Header 
        isAdmin={isAdmin} 
        username={username} 
        isDark={isDark} 
        logoutMag={logoutMag} 
        handleLogout={handleLogout} 
      />

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && (
          <HomeTab 
            isNearSpot={isNearSpot} 
            totalPoints={totalPoints} 
            foundCount={unlockedSpots.length} 
            unlockedSpots={unlockedSpots} 
            spots={spots} 
            colors={colors} 
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTab 
            leaderboard={leaderboard} 
            username={username} 
            colors={colors} 
          />
        )}

        {activeTab === 'explore' && (
          <ExploreTab 
            mapCenter={mapCenter} 
            isDark={isDark} 
            spots={spots} 
            colors={colors} 
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab 
            tempUsername={tempUsername} 
            setTempUsername={setTempUsername} 
            saveUsername={saveUsername} 
            colors={colors} 
            isDark={isDark} 
          />
        )}

        {activeTab === 'dev' && isAdmin && (
          <AdminTab 
            spots={spots} 
            unlockedSpots={unlockedSpots} 
            claimSpot={claimSpot} 
            removeSpot={removeSpot} 
            isDark={isDark} 
            colors={colors} 
          />
        )}
      </div>

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
        colors={colors} 
      />
    </div>
  );
}
