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
  const [showEmail, setShowEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [userLocation, setUserLocation] = useState(null);
  const [isNearSpot, setIsNearSpot] = useState(false);
  const [mapCenter] = useState([40.730610, -73.935242]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isAtTop, setIsAtTop] = useState(true);

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
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Fetch Spots
        const { data: dbSpots, error: spotsError } = await supabase.from('spots').select('*');
        let currentSpots = {};
        if (dbSpots) {
          currentSpots = dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
          setSpots(currentSpots);
        }

        // 2. Check Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase.from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUnlockedSpots(profile.unlocked_spots || []);
            setUsername(profile.username || '');
            setTempUsername(profile.username || '');
            setShowEmail(profile.show_email ?? false);
          }
        }
        
        // 3. Fetch Leaderboard using the spots we just got
        await fetchLeaderboard(currentSpots);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        // Force loading to stop even if some data fails
        setLoading(false);
      }
    };

    initApp();

    const watchId = navigator.geolocation.watchPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update proximity when location or spots change
  useEffect(() => {
    if (userLocation && Object.keys(spots).length > 0) {
      const nearby = Object.values(spots).some(spot => 
        getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng) < 0.25
      );
      setIsNearSpot(nearby);
    }
  }, [userLocation, spots]);

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

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    window.location.href = '/'; 
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6 relative`}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
        className={`fixed top-6 right-6 p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-900 text-emerald-400 border-white/10' : 'bg-white text-emerald-600 border-emerald-200 shadow-lg'}`}>
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>
      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
        <MapPin size={32} className="text-white" />
      </div>
      <h1 className={`text-3xl font-bold mb-8 ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} 
        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20">
        Sign in with GitHub
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-40 selection:bg-emerald-500/30`}>
      
      {/* ALWAYS VISIBLE THEME TOGGLE */}
      <button 
        ref={themeMag.ref} 
        onMouseMove={themeMag.handleMouseMove} 
        onMouseLeave={themeMag.reset}
        style={{ 
          transform: `translate(${themeMag.position.x + (isAtTop ? -58 : 0)}px, ${themeMag.position.y}px)`,
          transition: themeMag.position.x === 0 
            ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : 'none'
        }}
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        className={`fixed top-16 right-10 p-3.5 rounded-2xl border active:scale-90 z-[10000] ${
          isDark 
          ? 'bg-zinc-900/80 border-white/10 text-emerald-400 shadow-2xl' 
          : 'bg-white/90 border-emerald-200 text-emerald-600 shadow-xl backdrop-blur-md'
        }`}
      >
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <Header 
        isAdmin={isAdmin} 
        username={username} 
        email={user?.email}
        showEmail={showEmail}
        isDark={isDark} 
        logoutMag={logoutMag} 
        handleLogout={handleLogout} 
      />

      <main className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && <HomeTab isNearSpot={isNearSpot} totalPoints={totalPoints} foundCount={unlockedSpots.length} unlockedSpots={unlockedSpots} spots={spots} colors={colors} />}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} colors={colors} isDark={isDark} />}
        {activeTab === 'dev' && isAdmin && <AdminTab spots={spots} colors={colors} />}
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
    </div>
  );
}
