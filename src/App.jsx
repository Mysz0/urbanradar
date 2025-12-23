import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, User, Home, Compass, LogOut, Save, Terminal, Zap, Trash2, Sun, Moon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabase'; 

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

// Leaflet Fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const [spots, setSpots] = useState({}); // Now starts empty
  const [unlockedSpots, setUnlockedSpots] = useState([]);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [mapCenter] = useState([40.730610, -73.935242]);

  const isAdmin = user?.id === ADMIN_UID;
  const isDark = theme === 'dark';

  useEffect(() => {
    const initApp = async () => {
      // 1. Fetch Session
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Fetch Spots from Database
      const { data: spotsData } = await supabase.from('spots').select('*');
      if (spotsData) {
        // Convert array to object for easy lookup by ID: spots['spot-001']
        const spotsObj = spotsData.reduce((acc, spot) => ({ ...acc, [spot.id]: spot }), {});
        setSpots(spotsObj);
      }

      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setUnlockedSpots(profile.unlocked_spots || []);
          setUsername(profile.username || '');
          setTempUsername(profile.username || '');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const claimSpot = async (spotId) => {
    if (unlockedSpots.includes(spotId)) return;
    const newUnlocked = [...unlockedSpots, spotId];
    const { error } = await supabase.from('profiles').update({ unlocked_spots: newUnlocked }).eq('id', user.id);
    if (!error) setUnlockedSpots(newUnlocked);
  };

  const saveUsername = async () => {
    const cleaned = tempUsername.replace('@', '').trim();
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: cleaned });
    if (!error) { setUsername(cleaned); alert("ID Updated!"); }
  };

  const totalPoints = unlockedSpots.reduce((sum, id) => sum + (spots[id]?.points || 0), 0);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-emerald-500 italic">FETCHING_DATABASE...</div>;

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-900'} text-white p-6`}>
        <h1 className="text-5xl font-black mb-8 italic tracking-tighter uppercase">SPOT<span className="text-emerald-500">HUNT</span></h1>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-white text-black px-12 py-4 rounded-2xl font-black">LOGIN WITH GITHUB</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} pb-32`}>
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-8 pt-16 pb-24 rounded-b-[48px] shadow-2xl relative border-b-4 border-emerald-500/20">
        <div className="max-w-md mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-emerald-500 uppercase">@{username || 'HUNTER'} {isAdmin && "👑"}</h1>
            <p className="text-slate-500 text-xs font-mono">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleTheme} className="p-3 bg-slate-800 rounded-2xl text-emerald-500">{isDark ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button onClick={() => { supabase.auth.signOut(); window.location.href='/'; }} className="p-3 bg-slate-800 rounded-2xl text-slate-400"><LogOut size={20}/></button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-14 relative z-20">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-[32px] p-8 shadow-xl flex justify-between items-center`}>
              <div><p className="text-5xl font-black leading-none">{totalPoints}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Score</p></div>
              <div className="text-right"><p className="text-2xl font-black leading-none">{unlockedSpots.length}/{Object.keys(spots).length}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Claimed</p></div>
            </div>

            <div className="space-y-3">
              {unlockedSpots.map(id => (
                <div key={id} className={`${isDark ? 'bg-slate-900' : 'bg-white'} p-5 rounded-3xl flex items-center gap-4 border border-slate-100/10 shadow-sm font-black uppercase text-sm`}>
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">✓</div> {spots[id]?.name || 'Unknown Spot'}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-[40px] p-2 shadow-2xl h-[450px] overflow-hidden`}>
            <MapContainer key={`${activeTab}-${theme}`} center={mapCenter} zoom={12} className="h-full w-full rounded-[32px]">
              <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} />
              {Object.values(spots).map(spot => (
                <Marker key={spot.id} position={[spot.lat, spot.lng]}>
                  <Popup><span className="font-black uppercase text-xs">{spot.name} ({spot.points} pts)</span></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className={`${isDark ? 'bg-slate-900' : 'bg-white'} p-8 rounded-[40px] space-y-4`}>
            <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} className={`w-full ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-2xl p-4 font-black outline-none`} />
            <button onClick={saveUsername} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black">SAVE PROFILE</button>
          </div>
        )}

        {activeTab === 'dev' && isAdmin && (
          <div className="bg-slate-900 p-8 rounded-[40px] space-y-4 border-4 border-emerald-500/20 text-white">
            <h2 className="font-black text-emerald-500 italic uppercase">Admin Database Control</h2>
            {Object.values(spots).map(spot => (
              <button key={spot.id} onClick={() => claimSpot(spot.id)} disabled={unlockedSpots.includes(spot.id)} className="w-full bg-slate-800 p-4 rounded-2xl text-xs font-black uppercase flex justify-between">
                {spot.name} <Zap size={14}/>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* NAV BAR */}
      <nav className="fixed bottom-8 left-6 right-6 bg-slate-900/95 backdrop-blur-lg rounded-[32px] p-2 shadow-2xl z-[9999] flex justify-around items-center">
        <button onClick={() => setActiveTab('home')} className={`p-4 rounded-2xl ${activeTab === 'home' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><Home size={22}/></button>
        <button onClick={() => setActiveTab('explore')} className={`p-4 rounded-2xl ${activeTab === 'explore' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><Compass size={22}/></button>
        <button onClick={() => setActiveTab('profile')} className={`p-4 rounded-2xl ${activeTab === 'profile' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><User size={22}/></button>
        {isAdmin && <button onClick={() => setActiveTab('dev')} className={`p-4 rounded-2xl ${activeTab === 'dev' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}><Terminal size={22}/></button>}
      </nav>
    </div>
  );
}
