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
  
  // Track scroll for button dodging
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
      // Logic: Only snap back to corner once header is totally gone
      setIsAtTop(window.scrollY < 120);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          setShowEmail(data.show_email ?? false);
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-40 transition-colors duration-500`}>
      
      {/* 1. FIXED THEME TOGGLE 
          - Always visible because z-index is maxed out.
          - Slides horizontally when isAtTop is true.
      */}
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
          ? 'bg-zinc-900/80 border-white/10 text-emerald-400' 
          : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg backdrop-blur-md'
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

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && <HomeTab {...{isNearSpot, totalPoints: 0, foundCount: unlockedSpots.length, unlockedSpots, spots, colors}} />}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} colors={colors} isDark={isDark} />}
        {activeTab === 'dev' && isAdmin && <AdminTab spots={spots} colors={colors} />}
      </div>

      {/* 2. FIXED NAVBAR 
          - Added fixed bottom-0 to ensure it never moves.
      */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] p-6 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
        </div>
      </div>
    </div>
  );
}
