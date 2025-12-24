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
  const [isAtTop, setIsAtTop] = useState(true);

  const [lastChange, setLastChange] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); 
  const [detectionRadius, setDetectionRadius] = useState(0.25); 

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

  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  // --- ADMIN ACTIONS ---
  const resetMyTimer = async () => {
    const { error } = await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);
    if (!error) { setLastChange(null); showToast("Cooldown nuked."); }
  };

  const updateRadius = async (newRadius) => {
    const { error } = await supabase.from('profiles').update({ custom_radius: newRadius }).eq('id', user.id);
    if (!error) { setDetectionRadius(newRadius); showToast(`Radius: ${newRadius * 1000}m`); }
  };

  const addNewSpot = async (spotData) => {
    const newId = `spot-${Math.random().toString(36).substr(2, 5)}`;
    const { data, error } = await supabase.from('spots').insert([{ ...spotData, id: newId }]).select();
    if (!error && data) {
      setSpots(prev => ({ ...prev, [data[0].id]: data[0] }));
      showToast(`${data[0].name} deployed!`);
    } else { showToast(error?.message || "Error adding spot", "error"); }
  };

  const deleteSpotFromDB = async (spotId) => {
    const { error } = await supabase.from('spots').delete().eq('id', spotId);
    if (!error) {
      const updated = { ...spots };
      delete updated[spotId];
      setSpots(updated);
      showToast("Deleted from database");
    }
  };

  // --- CHECK-IN LOGIC ---
  const claimSpot = async (spotId) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const spot = spots[spotId];
    if (!spot) return;

    const currentData = visitData?.[spotId] || { streak: 0, lastVisit: null, totalEarned: 0 };

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
      ...visitData,
      [spotId]: {
        streak: newStreak,
        lastVisit: today,
        totalEarned: newTotalEarned
      }
    };

    const { error } = await supabase.from('profiles').update({ 
      visit_data: updatedVisitData,
      unlocked_spots: Array.from(new Set([...unlockedSpots, spotId]))
    }).eq('id', user.id);

    if (!error) {
      setVisitData(updatedVisitData);
      setUnlockedSpots(Object.keys(updatedVisitData));
      showToast(`Checked in! Streak: ${newStreak} (+${earnedThisTime} pts)`);
      fetchLeaderboard(spots);
    }
  };

  const removeSpot = async (spotId) => {
    const { [spotId]: removed, ...remainingVisitData } = visitData;
    const newUnlocked = unlockedSpots.filter(id => id !== spotId);
    
    const { error } = await supabase.from('profiles').update({ 
      visit_data: remainingVisitData,
      unlocked_spots: newUnlocked 
    }).eq('id', user.id);

    if (!error) {
      setVisitData(remainingVisitData);
      setUnlockedSpots(newUnlocked);
      fetchLeaderboard(spots);
    }
  };

  // --- EFFECTS ---
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

  useEffect(() => {
    if (userLocation && Object.values(spots).length > 0) {
      const nearby = Object.values(spots).some(spot => 
        getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng) < detectionRadius
      );
      setIsNearSpot(nearby);
    }
  }, [userLocation, spots, detectionRadius]);

  const fetchLeaderboard = async (currentSpots) => {
    const { data: profiles } = await supabase.from('profiles').select('username, visit_data');
    if (profiles) {
      const ranked = profiles.map(p => {
        const vData = p.visit_data || {};
        const score = Object.values(vData).reduce((sum, item) => sum + (item?.totalEarned || 0), 0);
        return {
          username: p.username || 'Anonymous',
          score: score,
          found: Object.keys(vData).length
        };
      }).sort((a, b) => b.score - a.score);
      setLeaderboard(ranked);
    }
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.replace('@', '').trim();
    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, username: cleaned, last_username_change: new Date().toISOString() 
    });
    if (!error) { setUsername(cleaned); showToast("Name updated!"); fetchLeaderboard(spots); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const totalPoints = visitData ? Object.values(visitData).reduce((sum, item) => sum + (item?.totalEarned || 0), 0) : 0;

  if (loading) return <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}><div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /></div>;

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6`}>
       <h1 className={`text-3xl font-bold mb-8 ${colors.text}`}>SpotHunt</h1>
       <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold">Sign in with GitHub</button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      {statusMsg.text && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <CheckCircle2 size={18} /> <span className="text-sm font-bold">{statusMsg.text}</span>
        </div>
      )}
      <Header isAdmin={isAdmin} username={username} email={user?.email} isDark={isDark} handleLogout={handleLogout} />
      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && <HomeTab isNearSpot={isNearSpot} totalPoints={totalPoints} foundCount={unlockedSpots.length} unlockedSpots={unlockedSpots} visitData={visitData} spots={spots} colors={colors} />}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} saveUsername={saveUsername} colors={colors} isDark={isDark} />}
        {activeTab === 'dev' && isAdmin && (
          <AdminTab spots={spots} unlockedSpots={unlockedSpots} claimSpot={claimSpot} removeSpot={removeSpot} isDark={isDark} colors={colors} resetTimer={resetMyTimer} currentRadius={detectionRadius} updateRadius={updateRadius} addNewSpot={addNewSpot} deleteSpotFromDB={deleteSpotFromDB} userLocation={userLocation} />
        )}
      </div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
    </div>
  );
}
