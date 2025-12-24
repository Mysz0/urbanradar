import React, { useState, useEffect } from 'react';
import { Sun, Moon, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [visitData, setVisitData] = useState({}); 
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

  const [lastChange, setLastChange] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); 
  const [detectionRadius, setDetectionRadius] = useState(0.25); 

  const isAdmin = user?.id === ADMIN_UID;
  const isDark = theme === 'dark';
  const logoutMag = useMagnetic();

  const colors = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-[#f0f4f2]',
    card: isDark ? 'bg-zinc-900/40 border-white/[0.03] shadow-2xl' : 'bg-white/70 border-emerald-200/50 shadow-md shadow-emerald-900/5',
    text: isDark ? 'text-zinc-100' : 'text-zinc-900',
  };

  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  // --- ACTIONS ---
  const resetMyTimer = async () => {
    const { error } = await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);
    if (!error) { setLastChange(null); showToast("Cooldown nuked."); }
  };

  const updateRadius = async (newRadius) => {
    const { error } = await supabase.from('profiles').update({ custom_radius: newRadius }).eq('id', user.id);
    if (!error) { setDetectionRadius(newRadius); showToast(`Radius set to ${newRadius * 1000}m`); }
  };

  const claimSpot = async (spotId) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const spot = spots[spotId];
    if (!spot) return;

    // CRASH PROTECTION: Default to empty object if visitData[spotId] doesn't exist
    const currentData = (visitData && visitData[spotId]) ? visitData[spotId] : { streak: 0, lastVisit: null, totalEarned: 0 };

    if (currentData.lastVisit === today) {
      showToast("Already checked in today!", "error");
      return;
    }

    let newStreak = 1;
    if (currentData.lastVisit === yesterdayStr) {
      newStreak = (currentData.streak || 0) + 1;
    }

    const multiplier = 1 + (newStreak * 0.1);
    const earnedThisTime = Math.round(spot.points * multiplier);
    const newTotalEarned = (currentData.totalEarned || 0) + earnedThisTime;

    const updatedVisitData = {
      ...(visitData || {}),
      [spotId]: { streak: newStreak, lastVisit: today, totalEarned: newTotalEarned }
    };

    const { error } = await supabase.from('profiles').update({ 
      visit_data: updatedVisitData,
      unlocked_spots: Array.from(new Set([...(unlockedSpots || []), spotId]))
    }).eq('id', user.id);

    if (!error) {
      setVisitData(updatedVisitData);
      setUnlockedSpots(Object.keys(updatedVisitData));
      showToast(`Checked in! Streak: ${newStreak}`);
      fetchLeaderboard(spots);
    }
  };

  const removeSpot = async (spotId) => {
    const updatedVisitData = { ...(visitData || {}) };
    delete updatedVisitData[spotId];
    const newUnlocked = (unlockedSpots || []).filter(id => id !== spotId);
    
    const { error } = await supabase.from('profiles').update({ 
      visit_data: updatedVisitData, unlocked_spots: newUnlocked 
    }).eq('id', user.id);

    if (!error) {
      setVisitData(updatedVisitData);
      setUnlockedSpots(newUnlocked);
      fetchLeaderboard(spots);
    }
  };

  // --- SYSTEM EFFECTS ---
  useEffect(() => {
    const root = window.document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const initApp = async () => {
      const { data: dbSpots } = await supabase.from('spots').select('*');
      const spotsObj = dbSpots ? dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}) : {};
      setSpots(spotsObj);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) {
          setUnlockedSpots(data.unlocked_spots || []);
          setVisitData(data.visit_data || {});
          setUsername(data.username || '');
          setTempUsername(data.username || '');
          setShowEmail(data.show_email ?? false);
          setLastChange(data.last_username_change);
          setDetectionRadius(data.custom_radius || 0.25);
          fetchLeaderboard(spotsObj);
        }
      }
      setLoading(false);
    };
    initApp();
    navigator.geolocation.watchPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });
  }, []);

  const fetchLeaderboard = async (currentSpots) => {
    const { data: profiles } = await supabase.from('profiles').select('username, visit_data, unlocked_spots');
    if (profiles) {
      const ranked = profiles.map(p => {
        const vData = p.visit_data || {};
        // Use visit_data if available, otherwise fallback to basic point sum for legacy users
        const score = Object.keys(vData).length > 0 
          ? Object.values(vData).reduce((sum, item) => sum + (item?.totalEarned || 0), 0)
          : (p.unlocked_spots || []).reduce((sum, id) => sum + (currentSpots[id]?.points || 0), 0);

        return {
          username: p.username || 'Anonymous',
          score: score,
          found: (p.unlocked_spots || []).length
        };
      }).sort((a, b) => b.score - a.score);
      setLeaderboard(ranked);
    }
  };

  // CRASH PROTECTION: Total points calculation
  const totalPoints = (visitData && Object.keys(visitData).length > 0)
    ? Object.values(visitData).reduce((sum, item) => sum + (item?.totalEarned || 0), 0)
    : (unlockedSpots || []).reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950"><div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /></div>;

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      {/* HOPPING THEME BUTTON */}
      <button 
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        className={`fixed top-16 right-10 p-3.5 rounded-2xl border active:scale-90 z-[10000] transition-all duration-500 
          ${isDark ? 'bg-zinc-900 border-white/10 text-emerald-400' : 'bg-white border-emerald-200 shadow-lg'}
          md:right-32 lg:right-40`}
      >
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <Header isAdmin={isAdmin} username={username} email={user?.email} isDark={isDark} handleLogout={() => supabase.auth.signOut()} />
      
      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && (
          <HomeTab 
            isNearSpot={isNearSpot} 
            totalPoints={totalPoints} 
            foundCount={(unlockedSpots || []).length} 
            unlockedSpots={unlockedSpots || []} 
            visitData={visitData || {}} 
            spots={spots || {}} 
            colors={colors} 
          />
        )}
        {/* ... Other Tabs remain the same ... */}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} saveUsername={() => {}} colors={colors} isDark={isDark} />}
        {activeTab === 'dev' && isAdmin && (
          <AdminTab spots={spots} unlockedSpots={unlockedSpots} claimSpot={claimSpot} removeSpot={removeSpot} isDark={isDark} colors={colors} resetTimer={resetMyTimer} currentRadius={detectionRadius} updateRadius={updateRadius} />
        )}
      </div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
    </div>
  );
}
