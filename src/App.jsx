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
  // --- ALL STATES PRESERVED ---
  const [spots, setSpots] = useState({});
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [visitData, setVisitData] = useState({ last_visit: null, streak: 0 });
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
  const [customRadius, setCustomRadius] = useState(0.25);
  const [lastChange, setLastChange] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); 

  // DYNAMIC NAVBAR STATES
  const [isNavbarShrunk, setIsNavbarShrunk] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // --- HELPERS ---
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

  // --- SYSTEM EFFECTS ---
  useEffect(() => {
    const root = window.document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY < 15);

      // Instant shrink trigger
      if (currentScrollY > lastScrollY && currentScrollY > 10) {
        setIsNavbarShrunk(true);
      } else if (currentScrollY < lastScrollY) {
        setIsNavbarShrunk(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const initApp = async () => {
      const { data: dbSpots } = await supabase.from('spots').select('*');
      let spotsObj = {};
      if (dbSpots) {
        spotsObj = dbSpots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
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
          setShowEmail(data.show_email ?? false);
          setLastChange(data.last_username_change);
          setVisitData(data.visit_data || { last_visit: null, streak: 0 });
          setCustomRadius(data.custom_radius || 0.25);
          fetchLeaderboard(spotsObj);
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
        getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng) < customRadius
      );
      setIsNearSpot(nearby);
    }
  }, [userLocation, spots, customRadius]);

  const fetchLeaderboard = async (currentSpots) => {
    const { data: profiles } = await supabase.from('profiles').select('username, unlocked_spots, visit_data');
    if (profiles) {
      const ranked = profiles.map(p => {
        const streak = p.visit_data?.streak || 0;
        const multiplier = streak > 1 ? 1.1 : 1.0;
        const score = (p.unlocked_spots || []).reduce((sum, id) => {
          const basePoints = currentSpots[id]?.points || 0;
          return sum + Math.round(basePoints * multiplier);
        }, 0);
        return { username: p.username || 'Anonymous', score, found: (p.unlocked_spots || []).length, streak };
      }).sort((a, b) => b.score - a.score);
      setLeaderboard(ranked);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const claimSpot = async (spotId) => {
    if (unlockedSpots.includes(spotId)) return showToast("Already logged", "error");
    const today = new Date(); today.setHours(0,0,0,0);
    const lastVisit = visitData.last_visit ? new Date(visitData.last_visit) : null;
    if (lastVisit) lastVisit.setHours(0,0,0,0);
    let newStreak = 1;
    if (lastVisit) {
      const diffDays = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) newStreak = visitData.streak;
      else if (diffDays === 1) newStreak = visitData.streak + 1;
    }
    const newUnlocked = [...unlockedSpots, spotId];
    const newVisitData = { last_visit: new Date().toISOString(), streak: newStreak };
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked, visit_data: newVisitData }).eq('id', user.id);
    if (!error) { setUnlockedSpots(newUnlocked); setVisitData(newVisitData); fetchLeaderboard(spots); showToast(newStreak > 1 ? `Streak Bonus: ${newStreak} Days!` : "Spot Logged!"); }
  };

  const currentMultiplier = visitData.streak > 1 ? 1.1 : 1.0;
  const totalPoints = unlockedSpots.reduce((sum, id) => sum + Math.round((spots[id]?.points || 0) * currentMultiplier), 0);

  if (loading) return <div className={`min-h-screen ${colors.bg} flex items-center justify-center`}><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!user) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.bg} p-6 relative transition-colors duration-500`}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`fixed top-12 right-6 p-3.5 rounded-2xl border transition-all z-[10000] ${isDark ? 'bg-zinc-900/80 border-white/10 text-emerald-400' : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg'}`}>
        {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>
      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3"><MapPin size={32} className="text-white" /></div>
      <h1 className={`text-3xl font-bold mb-8 ${colors.text}`}>SpotHunt</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-600 transition-all">Sign in with GitHub</button>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} pb-36 transition-colors duration-500`}>
      {statusMsg.text && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 px-6 py-3 rounded-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {statusMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-bold tracking-tight">{statusMsg.text}</span>
        </div>
      )}

      {/* THEME TOGGLE - ALIGNED HORIZONTALLY TO LOGOUT */}
      <button 
        ref={themeMag.ref} onMouseMove={themeMag.handleMouseMove} onMouseLeave={themeMag.reset}
        style={{ transform: `translate(${themeMag.position.x}px, ${themeMag.position.y}px)` }}
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        className={`fixed top-[4.2rem] right-[5.5rem] p-3 rounded-2xl border z-[10000] transition-all ${isDark ? 'bg-zinc-900/80 border-white/10 text-emerald-400' : 'bg-white/80 border-emerald-200 text-emerald-600 shadow-lg'}`}
      >
        {isDark ? <Sun size={16}/> : <Moon size={16}/>}
      </button>

      <Header isAdmin={isAdmin} username={username} email={user?.email} showEmail={showEmail} isDark={isDark} logoutMag={logoutMag} handleLogout={handleLogout} />

      <div className="max-w-md mx-auto px-6 -mt-16 relative z-30">
        {activeTab === 'home' && <HomeTab isNearSpot={isNearSpot} totalPoints={totalPoints} foundCount={unlockedSpots.length} unlockedSpots={unlockedSpots} spots={spots} colors={colors} streak={visitData.streak} />}
        {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} username={username} colors={colors} />}
        {activeTab === 'explore' && <ExploreTab mapCenter={mapCenter} isDark={isDark} spots={spots} colors={colors} />}
        {activeTab === 'profile' && <ProfileTab tempUsername={tempUsername} setTempUsername={setTempUsername} saveUsername={async () => {
          const cleaned = tempUsername.replace('@', '').trim();
          const { error } = await supabase.from('profiles').update({ username: cleaned, last_username_change: new Date().toISOString() }).eq('id', user.id);
          if (!error) { setUsername(cleaned); setLastChange(new Date().toISOString()); showToast("Identity updated!"); fetchLeaderboard(spots); }
        }} showEmail={showEmail} toggleEmailVisibility={async () => {
          const newValue = !showEmail;
          const { error } = await supabase.from('profiles').update({ show_email: newValue }).eq('id', user.id);
          if (!error) setShowEmail(newValue);
        }} colors={colors} isDark={isDark} lastChange={lastChange} />}
        
        {activeTab === 'dev' && isAdmin && (
          <AdminTab 
            spots={spots} unlockedSpots={unlockedSpots} claimSpot={claimSpot} 
            removeSpot={async (id) => {
              const newUnlocked = unlockedSpots.filter(x => x !== id);
              await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
              setUnlockedSpots(newUnlocked); fetchLeaderboard(spots);
            }} 
            isDark={isDark} colors={colors} userLocation={userLocation} currentRadius={customRadius} 
            updateRadius={async (v) => { await supabase.from('profiles').update({ custom_radius: v }).eq('id', user.id); setCustomRadius(v); }} 
            resetTimer={async () => { await supabase.from('profiles').update({ last_username_change: null }).eq('id', user.id); setLastChange(null); }} 
            addNewSpot={async (s) => { const id = s.name.toLowerCase().replace(/\s+/g, '-'); await supabase.from('spots').insert([{ id, ...s }]); setSpots(p => ({ ...p, [id]: { id, ...s } })); }} 
            deleteSpotFromDB={async (id) => { await supabase.from('spots').delete().eq('id', id); const n = {...spots}; delete n[id]; setSpots(n); }} 
          />
        )}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-[50] transition-all duration-300 ${isNavbarShrunk ? 'nav-shrink' : ''}`}>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} colors={colors} />
      </div>
    </div>
  );
}
