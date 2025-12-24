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

  // COOLDOWN & NOTIFICATION STATE
  const [lastChange, setLastChange] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); 

  // ADMIN OVERRIDE STATE
  const [detectionRadius, setDetectionRadius] = useState(0.25); 

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

  const showToast = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  // --- ADMIN ACTIONS ---
  const resetMyTimer = async () => {
    const { error } = await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id);
    if (!error) {
      setLastChange(null);
      showToast("Cooldown nuked. You can change now.");
    }
  };

  const updateRadius = async (newRadius) => {
    const { error } = await supabase.from('profiles').update({ custom_radius: newRadius }).eq('id', user.id);
    if (!error) {
      setDetectionRadius(newRadius);
      showToast(`Radius set to ${newRadius * 1000}m`);
    }
  };

  const addNewSpot = async (spotData) => {
    // Generate an ID to match your pattern if the DB doesn't do it automatically
    const newId = `spot-${Math.random().toString(36).substr(2, 5)}`;
    
    const { data, error } = await supabase
      .from('spots')
      .insert([{ ...spotData, id: newId }])
      .select();

    if (!error && data) {
      const newSpot = data[0];
      setSpots(prev => ({ ...prev, [newSpot.id]: newSpot }));
      showToast(`${newSpot.name} deployed to map!`);
    } else {
      console.error("Supabase Error:", error?.message);
      showToast(error?.message || "Error adding spot", "error");
    }
  };

  const deleteSpotFromDB = async (spotId) => {
    const { error } = await supabase.from('spots').delete().eq('id', spotId);
    if (!error) {
      const updatedSpots = { ...spots };
      delete updatedSpots[spotId];
      setSpots(updatedSpots);
      showToast("Spot deleted from database");
    } else {
      showToast("Error deleting spot", "error");
    }
  };

  // --- SYSTEM EFFECTS ---
  useEffect(() => {
    const root = window.document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY < 100);
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
          setLastChange(data.last_username_change);
          setDetectionRadius(data.custom_radius || 0.25);
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
        getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng) < detectionRadius
      );
      setIsNearSpot(nearby);
    }
  }, [userLocation, spots, detectionRadius]);

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

  const toggleEmailVisibility = async () => {
    const newValue = !showEmail;
    const { error } = await supabase.from('profiles').update({ show_email: newValue }).eq('id', user.id);
    if (!error) setShowEmail(newValue);
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.replace('@', '').trim();
    if (cleaned === username) return showToast("Name already set", "error");

    if (lastChange) {
      const last = new Date(lastChange).getTime();
      const now = new Date().getTime();
      const daysPassed = (now - last) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7 && !isAdmin) {
        return showToast(`Cooldown: ${Math.ceil(7 - daysPassed)} days left`, "error");
      }
    }

    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, username: cleaned, show_email: showEmail, last_username_change: new Date().toISOString() 
    });

    if (!error) { 
      setUsername(cleaned); 
      setLastChange(new Date().toISOString());
      showToast("Identity updated!"); 
      fetchLeaderboard(spots); 
    } else { showToast("Error updating name", "error"); }
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

  if (loading) return (
    <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6 transition-colors duration-500`}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="fixed top-6 right-6 p-4 rounded-2xl border bg-white/10 backdrop-blur-md">
        {isDark ? <Sun size={18} className="text-emerald-400"/> : <Moon size={18} className="text-emerald-600"/>}
      </button>
      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
        <MapPin size={32} className="text-white" />
      </div>
      <h1 className={`text-3xl font-bold mb-8 tracking-tight ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20">Sign in with GitHub</button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500 selection:bg-emerald-500/30`}>
      {statusMsg.text && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4 ${statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {statusMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-bold">{statusMsg.text}</span>
        </div>
      )}

      <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} className={`fixed top-16 right-10 p-3.5 rounded-2xl border active:scale-90 z-[10000] ${isDark ? 'bg-zinc-900 border-white/10 text-emerald-400' : 'bg-white border-emerald-200 shadow-lg'}`}>
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      <Header isAdmin={isAdmin} username={username} email={user?.email} showEmail={showEmail} isDark={isDark} logoutMag={logoutMag} handleLogout={handleLogout} />

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && <HomeTab isNearSpot={isNearSpot} totalPoints={totalPoints} foundCount={unlockedSpots.length} unlockedSpots={unlockedSpots} spots={spots} colors={colors} />}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} saveUsername={saveUsername} showEmail={showEmail} toggleEmailVisibility={toggleEmailVisibility} colors={colors} isDark={isDark} lastChange={lastChange} />}
        {activeTab === 'dev' && isAdmin && (
          <AdminTab 
            spots={spots} unlockedSpots={unlockedSpots} 
            claimSpot={claimSpot} removeSpot={removeSpot} 
            isDark={isDark} colors={colors}
            resetTimer={resetMyTimer} currentRadius={detectionRadius} updateRadius={updateRadius}
            addNewSpot={addNewSpot} deleteSpotFromDB={deleteSpotFromDB}
            userLocation={userLocation} // Passed for the preview map
          />
        )}
      </div>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
    </div>
  );
}
